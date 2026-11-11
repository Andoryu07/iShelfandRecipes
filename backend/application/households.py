import secrets

from fastapi import HTTPException, status
from sqlalchemy import delete, select, update
from sqlalchemy.orm import Session

from application.models import Household, HouseholdMember, Reservation, StockItem, StorageLocation
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
    return session.scalar(
        select(HouseholdMember).where(
            HouseholdMember.userId == userId, HouseholdMember.householdId == householdId
        )
    )


def alreadyInHouseholdError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already belongs to a household")


def ensureUserHasNoHousehold(session: Session, userId: int) -> None:
    if session.scalar(select(HouseholdMember.id).where(HouseholdMember.userId == userId)) is not None:
        raise alreadyInHouseholdError()


def createDefaultStorageLocations(session: Session, householdId: int) -> None:
    for name, kind in defaultStorageLocations:
        session.add(StorageLocation(householdId=householdId, name=name, kind=kind))


def buildHouseholdResponse(household: Household, role: HouseholdRole) -> HouseholdResponse:
    return HouseholdResponse(
        id=household.id,
        name=household.name,
        inviteCode=formatInviteCode(household.inviteCode),
        role=role,
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
