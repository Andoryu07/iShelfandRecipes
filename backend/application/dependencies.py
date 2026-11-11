from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.households import findMembership
from application.models import Food, HouseholdMember, StockItem, StorageLocation, User
from application.models.enumerations import HouseholdRole
from application.security import decodeAccessToken

bearerScheme = HTTPBearer(auto_error=False)


def getCurrentUser(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearerScheme),
    session: Session = Depends(getDatabaseSession),
) -> User:
    userId = decodeAccessToken(credentials.credentials) if credentials else None
    user = session.get(User, userId) if userId is not None else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def getHouseholdMembership(
    householdId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> HouseholdMember:
    membership = findMembership(session, user.id, householdId)
    if membership is None:
        raise householdNotFoundError()
    return membership


def getHouseholdOwnership(membership: HouseholdMember = Depends(getHouseholdMembership)) -> HouseholdMember:
    if membership.role != HouseholdRole.owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the household owner can do this")
    return membership


def householdNotFoundError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")


def notFoundError(recordName: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{recordName} not found")


def getAccessibleStorageLocation(
    storageLocationId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> StorageLocation:
    storageLocation = session.get(StorageLocation, storageLocationId)
    if storageLocation is None or findMembership(session, user.id, storageLocation.householdId) is None:
        raise notFoundError("Storage location")
    return storageLocation


def getAccessibleFood(
    foodId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> Food:
    food = session.get(Food, foodId)
    if food is None or findMembership(session, user.id, food.householdId) is None:
        raise notFoundError("Food")
    return food


def getAccessibleStockItem(
    stockItemId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> StockItem:
    row = session.execute(
        select(StockItem, StorageLocation.householdId)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(StockItem.id == stockItemId)
    ).first()
    if row is None or findMembership(session, user.id, row.householdId) is None:
        raise notFoundError("Stock item")
    return row.StockItem
