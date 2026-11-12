from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership, getHouseholdOwnership
from application.households import (
    alreadyInHouseholdError,
    buildHouseholdResponse,
    createDefaultStorageLocations,
    ensureUserHasNoHousehold,
    findMembership,
    generateUniqueInviteCode,
    normalizeInviteCode,
    removeMember,
)
from application.models import Household, HouseholdMember, User
from application.models.enumerations import HouseholdRole
from application.recipes.predefined import copyPredefinedRecipes
from application.schemas.households import (
    CreateHouseholdRequest,
    HouseholdMemberResponse,
    HouseholdResponse,
    JoinHouseholdRequest,
    UpdateHouseholdRequest,
)

router = APIRouter(prefix="/households", tags=["households"])


@router.post("", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
def createHousehold(
    request: CreateHouseholdRequest,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> HouseholdResponse:
    ensureUserHasNoHousehold(session, user.id)
    household = Household(name=request.name, inviteCode=generateUniqueInviteCode(session))
    session.add(household)
    session.flush()
    session.add(HouseholdMember(userId=user.id, householdId=household.id, role=HouseholdRole.owner))
    createDefaultStorageLocations(session, household.id)
    copyPredefinedRecipes(session, household.id)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise alreadyInHouseholdError()
    return buildHouseholdResponse(household, HouseholdRole.owner)


@router.get("", response_model=list[HouseholdResponse])
def listHouseholds(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> list[HouseholdResponse]:
    rows = session.execute(
        select(Household, HouseholdMember.role)
        .join(HouseholdMember, HouseholdMember.householdId == Household.id)
        .where(HouseholdMember.userId == user.id)
        .order_by(Household.id)
    ).all()
    return [buildHouseholdResponse(household, role) for household, role in rows]


@router.post("/join", response_model=HouseholdResponse)
def joinHousehold(
    request: JoinHouseholdRequest,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> HouseholdResponse:
    household = session.scalar(
        select(Household).where(Household.inviteCode == normalizeInviteCode(request.inviteCode))
    )
    if household is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid invite code")
    ensureUserHasNoHousehold(session, user.id)
    session.add(HouseholdMember(userId=user.id, householdId=household.id, role=HouseholdRole.member))
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise alreadyInHouseholdError()
    return buildHouseholdResponse(household, HouseholdRole.member)


@router.get("/{householdId}", response_model=HouseholdResponse)
def getHousehold(
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> HouseholdResponse:
    return buildHouseholdResponse(session.get(Household, membership.householdId), membership.role)


@router.patch("/{householdId}", response_model=HouseholdResponse)
def updateHousehold(
    request: UpdateHouseholdRequest,
    membership: HouseholdMember = Depends(getHouseholdOwnership),
    session: Session = Depends(getDatabaseSession),
) -> HouseholdResponse:
    household = session.get(Household, membership.householdId)
    household.name = request.name
    session.commit()
    return buildHouseholdResponse(household, membership.role)


@router.post("/{householdId}/invite-code", response_model=HouseholdResponse)
def regenerateInviteCode(
    membership: HouseholdMember = Depends(getHouseholdOwnership),
    session: Session = Depends(getDatabaseSession),
) -> HouseholdResponse:
    household = session.get(Household, membership.householdId)
    household.inviteCode = generateUniqueInviteCode(session)
    session.commit()
    return buildHouseholdResponse(household, membership.role)


@router.get("/{householdId}/members", response_model=list[HouseholdMemberResponse])
def listMembers(
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[HouseholdMemberResponse]:
    rows = session.execute(
        select(HouseholdMember, User.displayName)
        .join(User, User.id == HouseholdMember.userId)
        .where(HouseholdMember.householdId == membership.householdId)
        .order_by(HouseholdMember.joinedAt, HouseholdMember.id)
    ).all()
    return [
        HouseholdMemberResponse(
            userId=member.userId, displayName=displayName, role=member.role, joinedAt=member.joinedAt
        )
        for member, displayName in rows
    ]


@router.delete("/{householdId}/members/{userId}", status_code=status.HTTP_204_NO_CONTENT)
def deleteMember(
    userId: int,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    removedMembership = findMembership(session, userId, membership.householdId)
    if removedMembership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    if removedMembership.id != membership.id and membership.role != HouseholdRole.owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the household owner can do this")
    removeMember(session, removedMembership)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
