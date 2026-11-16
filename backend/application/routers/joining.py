import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.plans import householdMemberCount, householdMemberLimit
from application.database import getDatabaseSession, getSessionFactory
from application.dependencies import getCurrentUser, getHouseholdOwnership, notFoundError
from application.households import (
    alreadyInHouseholdError,
    buildHouseholdResponse,
    ensureUserHasNoHousehold,
    normalizeInviteCode,
)
from application.models import Household, HouseholdMember, InviteLink, JoinRequest, PushSubscription, User
from application.models.enumerations import HouseholdRole
from application.notifications.push import PushSender, getPushSender, sendToSubscriptions
from application.schemas.households import (
    CreatedInviteLinkResponse,
    HouseholdResponse,
    InviteLinkResponse,
    JoinByLinkRequest,
    JoinHouseholdRequest,
    JoinRequestResponse,
    PendingJoinRequestResponse,
)
from application.security import hashRefreshToken

router = APIRouter(tags=["joining households"])
inviteLinkLifetime = timedelta(days=7)


def maskEmail(email: str) -> str:
    local, _, domain = email.partition("@")
    return f"{local[:2]}{'•' * 3}@{domain}"


def buildJoinRequestResponse(session: Session, joinRequest: JoinRequest) -> JoinRequestResponse:
    household = session.get(Household, joinRequest.householdId)
    return JoinRequestResponse(
        id=joinRequest.id,
        householdName=household.name,
        isRejected=joinRequest.rejectedAt is not None,
        createdAt=joinRequest.createdAt,
    )


def notifyOwners(sender: PushSender, householdId: int, displayName: str) -> None:
    with getSessionFactory()() as session:
        subscriptions = list(
            session.scalars(
                select(PushSubscription)
                .join(HouseholdMember, HouseholdMember.userId == PushSubscription.userId)
                .where(HouseholdMember.householdId == householdId, HouseholdMember.role == HouseholdRole.owner)
            )
        )
        if subscriptions:
            sendToSubscriptions(session, sender, subscriptions, {"type": "joinRequest", "name": displayName})
            session.commit()


def joinAsMember(session: Session, user: User, householdId: int) -> HouseholdMember:
    ensureUserHasNoHousehold(session, user.id)
    if householdMemberCount(session, householdId) >= householdMemberLimit(session, householdId):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The household is full")
    membership = HouseholdMember(userId=user.id, householdId=householdId, role=HouseholdRole.member)
    session.add(membership)
    existingRequest = session.scalar(select(JoinRequest).where(JoinRequest.userId == user.id))
    if existingRequest is not None:
        session.delete(existingRequest)
    return membership


@router.post("/households/join", response_model=JoinRequestResponse, status_code=status.HTTP_202_ACCEPTED)
def requestToJoin(
    request: JoinHouseholdRequest,
    backgroundTasks: BackgroundTasks,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
    sender: PushSender = Depends(getPushSender),
) -> JoinRequestResponse:
    household = session.scalar(
        select(Household).where(Household.inviteCode == normalizeInviteCode(request.inviteCode))
    )
    if household is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")
    ensureUserHasNoHousehold(session, user.id)
    joinRequest = session.scalar(select(JoinRequest).where(JoinRequest.userId == user.id))
    if joinRequest is None:
        joinRequest = JoinRequest(userId=user.id, householdId=household.id)
        session.add(joinRequest)
    else:
        joinRequest.householdId = household.id
        joinRequest.rejectedAt = None
        joinRequest.createdAt = datetime.now(timezone.utc)
    session.commit()
    backgroundTasks.add_task(notifyOwners, sender, household.id, user.displayName)
    return buildJoinRequestResponse(session, joinRequest)


@router.get("/join-requests/mine", response_model=JoinRequestResponse | None)
def getOwnJoinRequest(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> JoinRequestResponse | None:
    joinRequest = session.scalar(select(JoinRequest).where(JoinRequest.userId == user.id))
    return buildJoinRequestResponse(session, joinRequest) if joinRequest else None


@router.delete("/join-requests/mine", status_code=status.HTTP_204_NO_CONTENT)
def cancelOwnJoinRequest(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> Response:
    joinRequest = session.scalar(select(JoinRequest).where(JoinRequest.userId == user.id))
    if joinRequest is not None:
        session.delete(joinRequest)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/households/{householdId}/join-requests", response_model=list[PendingJoinRequestResponse])
def listJoinRequests(
    membership: HouseholdMember = Depends(getHouseholdOwnership), session: Session = Depends(getDatabaseSession)
) -> list[PendingJoinRequestResponse]:
    rows = session.execute(
        select(JoinRequest, User)
        .join(User, User.id == JoinRequest.userId)
        .where(JoinRequest.householdId == membership.householdId, JoinRequest.rejectedAt.is_(None))
        .order_by(JoinRequest.createdAt, JoinRequest.id)
    ).all()
    return [
        PendingJoinRequestResponse(
            id=joinRequest.id,
            displayName=user.displayName,
            maskedEmail=maskEmail(user.email),
            createdAt=joinRequest.createdAt,
        )
        for joinRequest, user in rows
    ]


def getPendingRequestOfOwnHousehold(
    requestId: int, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> JoinRequest:
    joinRequest = session.get(JoinRequest, requestId)
    if joinRequest is None or joinRequest.rejectedAt is not None:
        raise notFoundError("Join request")
    owner = session.scalar(
        select(HouseholdMember).where(
            HouseholdMember.householdId == joinRequest.householdId,
            HouseholdMember.userId == user.id,
            HouseholdMember.role == HouseholdRole.owner,
        )
    )
    if owner is None:
        raise notFoundError("Join request")
    return joinRequest


@router.post("/join-requests/{requestId}/approve", status_code=status.HTTP_204_NO_CONTENT)
def approveJoinRequest(
    joinRequest: JoinRequest = Depends(getPendingRequestOfOwnHousehold),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    applicant = session.get(User, joinRequest.userId)
    householdId = joinRequest.householdId
    try:
        joinAsMember(session, applicant, householdId)
        session.commit()
    except IntegrityError:
        session.rollback()
        raise alreadyInHouseholdError()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/join-requests/{requestId}/reject", status_code=status.HTTP_204_NO_CONTENT)
def rejectJoinRequest(
    joinRequest: JoinRequest = Depends(getPendingRequestOfOwnHousehold),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    joinRequest.rejectedAt = datetime.now(timezone.utc)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def activeInviteLinks(session: Session, householdId: int):
    now = datetime.now(timezone.utc)
    return session.scalars(
        select(InviteLink)
        .where(
            InviteLink.householdId == householdId,
            InviteLink.usedAt.is_(None),
            InviteLink.revokedAt.is_(None),
            InviteLink.expiresAt > now,
        )
        .order_by(InviteLink.createdAt.desc(), InviteLink.id.desc())
    ).all()


@router.post(
    "/households/{householdId}/invite-links",
    response_model=CreatedInviteLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
def createInviteLink(
    membership: HouseholdMember = Depends(getHouseholdOwnership), session: Session = Depends(getDatabaseSession)
) -> CreatedInviteLinkResponse:
    token = secrets.token_urlsafe(24)
    link = InviteLink(
        householdId=membership.householdId,
        tokenHash=hashRefreshToken(token),
        createdByUserId=membership.userId,
        expiresAt=datetime.now(timezone.utc) + inviteLinkLifetime,
    )
    session.add(link)
    session.commit()
    return CreatedInviteLinkResponse(id=link.id, token=token, expiresAt=link.expiresAt, createdAt=link.createdAt)


@router.get("/households/{householdId}/invite-links", response_model=list[InviteLinkResponse])
def listInviteLinks(
    membership: HouseholdMember = Depends(getHouseholdOwnership), session: Session = Depends(getDatabaseSession)
) -> list[InviteLinkResponse]:
    return [
        InviteLinkResponse(id=link.id, expiresAt=link.expiresAt, createdAt=link.createdAt)
        for link in activeInviteLinks(session, membership.householdId)
    ]


@router.delete("/invite-links/{linkId}", status_code=status.HTTP_204_NO_CONTENT)
def revokeInviteLink(
    linkId: int, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> Response:
    link = session.get(InviteLink, linkId)
    owner = (
        session.scalar(
            select(HouseholdMember).where(
                HouseholdMember.householdId == link.householdId,
                HouseholdMember.userId == user.id,
                HouseholdMember.role == HouseholdRole.owner,
            )
        )
        if link
        else None
    )
    if owner is None:
        raise notFoundError("Invite link")
    link.revokedAt = link.revokedAt or datetime.now(timezone.utc)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/households/join-by-link", response_model=HouseholdResponse)
def joinByLink(
    request: JoinByLinkRequest, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> HouseholdResponse:
    link = session.scalar(
        select(InviteLink).where(InviteLink.tokenHash == hashRefreshToken(request.token)).with_for_update()
    )
    if (
        link is None
        or link.usedAt is not None
        or link.revokedAt is not None
        or link.expiresAt <= datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="The invite link is not valid any more")
    membership = joinAsMember(session, user, link.householdId)
    link.usedAt = datetime.now(timezone.utc)
    link.usedByUserId = user.id
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise alreadyInHouseholdError()
    return buildHouseholdResponse(session.get(Household, link.householdId), membership)
