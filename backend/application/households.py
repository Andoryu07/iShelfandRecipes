import secrets

from fastapi import HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from application.models import (
    Household,
    HouseholdMember,
    Reservation,
    ShoppingListItem,
    StockItem,
    StorageLocation,
    User,
)
from application.requestContext import requestChangesData
from application.plans import (
    householdIsLocked,
    householdCount,
    householdLimits,
    householdMemberCount,
    limitsOf,
    storageLocationCount,
)
from application.models.enumerations import HouseholdRole, ReservationStatus, StorageLocationKind
from application.schemas.households import HouseholdResponse

inviteCodeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
inviteCodeLength = 8
defaultStorageLocations = [
    ("Fridge", StorageLocationKind.fridge),
    ("Freezer", StorageLocationKind.freezer),
    ("Pantry", StorageLocationKind.pantry),
]


def normalizeInviteCode(inviteCode: str) -> str:
    return "".join(character for character in inviteCode.upper() if character.isalnum())


def formatInviteCode(inviteCode: str) -> str:
    half = len(inviteCode) // 2
    return f"{inviteCode[:half]}-{inviteCode[half:]}"


def generateUniqueInviteCode(session: Session) -> str:
    while True:
        inviteCode = "".join(secrets.choice(inviteCodeAlphabet) for _ in range(inviteCodeLength))
        if session.scalar(select(Household.id).where(Household.inviteCode == inviteCode)) is None:
            return inviteCode


def findMembership(session: Session, userId: int, householdId: int) -> HouseholdMember | None:
    membership = session.scalar(
        select(HouseholdMember).where(
            HouseholdMember.userId == userId, HouseholdMember.householdId == householdId
        )
    )
    if membership is not None and requestChangesData() and householdIsLocked(session, householdId):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="The household is locked")
    return membership


def alreadyInHouseholdError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already belongs to this household")


def householdLimitError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The household limit is reached")


def ensureUserCanAddHousehold(session: Session, user: User, householdId: int | None = None) -> None:
    if householdId is not None and findMembership(session, user.id, householdId) is not None:
        raise alreadyInHouseholdError()
    if householdCount(session, user) >= limitsOf(user).households:
        raise householdLimitError()


def createDefaultStorageLocations(session: Session, householdId: int) -> None:
    for name, kind in defaultStorageLocations:
        session.add(StorageLocation(householdId=householdId, name=name, kind=kind))


def buildHouseholdResponse(session: Session, household: Household, membership: HouseholdMember) -> HouseholdResponse:
    limits = householdLimits(session, household.id)
    memberCount = householdMemberCount(session, household.id)
    return HouseholdResponse(
        memberCount=memberCount,
        memberLimit=limits.householdMembers,
        storageLocationCount=storageLocationCount(session, household.id),
        storageLocationLimit=limits.storageLocations,
        isLocked=memberCount > limits.householdMembers,
        canShare=limits.canShareHousehold,
        id=household.id,
        name=household.name,
        inviteCode=formatInviteCode(household.inviteCode),
        role=membership.role,
        notificationHour=membership.notificationHour,
        expirationWarningDays=membership.expirationWarningDays,
        createdAt=household.createdAt,
    )


def cancelActiveReservations(session: Session, userId: int, householdId: int) -> None:
    householdStockItemIds = (
        select(StockItem.id)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(StorageLocation.householdId == householdId)
    )
    session.execute(
        update(Reservation)
        .where(
            Reservation.userId == userId,
            Reservation.status == ReservationStatus.active,
            Reservation.stockItemId.in_(householdStockItemIds),
        )
        .values(status=ReservationStatus.cancelled)
    )


def removeMember(session: Session, membership: HouseholdMember) -> None:
    householdId = membership.householdId
    wasOwner = membership.role == HouseholdRole.owner
    cancelActiveReservations(session, membership.userId, householdId)
    session.execute(
        delete(ShoppingListItem).where(
            ShoppingListItem.householdId == householdId, ShoppingListItem.ownerUserId == membership.userId
        )
    )
    session.delete(membership)
    session.flush()
    longestStandingMember = session.scalar(
        select(HouseholdMember)
        .where(HouseholdMember.householdId == householdId)
        .order_by(HouseholdMember.joinedAt, HouseholdMember.id)
        .limit(1)
    )
    if longestStandingMember is None:
        session.execute(delete(Household).where(Household.id == householdId))
    elif wasOwner:
        longestStandingMember.role = HouseholdRole.owner
