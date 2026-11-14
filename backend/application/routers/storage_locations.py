from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select, update
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getAccessibleStorageLocation, getHouseholdMembership
from application.foods import buildFoodResponse
from application.models import Food, HouseholdMember, StockItem, StockMovement, StorageLocation, User
from application.models.enumerations import StockMovementReason
from application.schemas.stock import StorageLocationHistoryEvent
from application.schemas.storage_locations import (
    CreateStorageLocationRequest,
    StorageLocationResponse,
    UpdateStorageLocationRequest,
)

router = APIRouter(tags=["storage locations"])


def buildStorageLocationResponse(storageLocation: StorageLocation) -> StorageLocationResponse:
    return StorageLocationResponse(
        id=storageLocation.id,
        householdId=storageLocation.householdId,
        name=storageLocation.name,
        icon=storageLocation.icon,
        kind=storageLocation.kind,
    )


def moveUsedUpStockItems(session: Session, storageLocation: StorageLocation) -> None:
    hasStockItems = session.scalar(
        select(StockItem.id).where(StockItem.storageLocationId == storageLocation.id).limit(1)
    )
    if hasStockItems is None:
        return
    replacementStorageLocationId = session.scalar(
        select(StorageLocation.id)
        .where(StorageLocation.householdId == storageLocation.householdId, StorageLocation.id != storageLocation.id)
        .order_by(StorageLocation.id)
        .limit(1)
    )
    if replacementStorageLocationId is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="The last storage location cannot be deleted while it keeps stock history",
        )
    session.execute(
        update(StockItem)
        .where(StockItem.storageLocationId == storageLocation.id)
        .values(storageLocationId=replacementStorageLocationId)
    )


@router.get("/households/{householdId}/storage-locations", response_model=list[StorageLocationResponse])
def listStorageLocations(
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[StorageLocationResponse]:
    storageLocations = session.scalars(
        select(StorageLocation)
        .where(StorageLocation.householdId == membership.householdId)
        .order_by(StorageLocation.id)
    ).all()
    return [buildStorageLocationResponse(storageLocation) for storageLocation in storageLocations]


@router.post(
    "/households/{householdId}/storage-locations",
    response_model=StorageLocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def createStorageLocation(
    request: CreateStorageLocationRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> StorageLocationResponse:
    storageLocation = StorageLocation(
        householdId=membership.householdId, name=request.name, kind=request.kind, icon=request.icon
    )
    session.add(storageLocation)
    session.commit()
    return buildStorageLocationResponse(storageLocation)


@router.patch("/storage-locations/{storageLocationId}", response_model=StorageLocationResponse)
def updateStorageLocation(
    request: UpdateStorageLocationRequest,
    storageLocation: StorageLocation = Depends(getAccessibleStorageLocation),
    session: Session = Depends(getDatabaseSession),
) -> StorageLocationResponse:
    if request.name is not None:
        storageLocation.name = request.name
    if "icon" in request.model_fields_set:
        storageLocation.icon = request.icon
    if request.kind is not None:
        storageLocation.kind = request.kind
    session.commit()
    return buildStorageLocationResponse(storageLocation)


@router.delete("/storage-locations/{storageLocationId}", status_code=status.HTTP_204_NO_CONTENT)
def deleteStorageLocation(
    storageLocation: StorageLocation = Depends(getAccessibleStorageLocation),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    remainingStockItemId = session.scalar(
        select(StockItem.id)
        .where(StockItem.storageLocationId == storageLocation.id, StockItem.quantity > 0)
        .limit(1)
    )
    if remainingStockItemId is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Storage location still contains food")
    moveUsedUpStockItems(session, storageLocation)
    session.delete(storageLocation)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


def movementEvent(movement: StockMovement, food: Food, displayName: str | None, storageLocationId: int):
    if movement.reason == StockMovementReason.moved:
        isIncoming = movement.targetStorageLocationId == storageLocationId
        return StorageLocationHistoryEvent(
            kind="movedIn" if isIncoming else "movedOut",
            food=buildFoodResponse(food),
            quantity=None,
            userDisplayName=displayName,
            otherStorageLocationId=movement.storageLocationId if isIncoming else movement.targetStorageLocationId,
            createdAt=movement.createdAt,
        )
    return StorageLocationHistoryEvent(
        kind=movement.reason.value,
        food=buildFoodResponse(food),
        quantity=abs(movement.quantityChange),
        userDisplayName=displayName,
        otherStorageLocationId=None,
        createdAt=movement.createdAt,
    )


@router.get("/storage-locations/{storageLocationId}/history", response_model=list[StorageLocationHistoryEvent])
def getStorageLocationHistory(
    limit: int = Query(default=50, ge=1, le=200),
    storageLocation: StorageLocation = Depends(getAccessibleStorageLocation),
    session: Session = Depends(getDatabaseSession),
) -> list[StorageLocationHistoryEvent]:
    movementRows = session.execute(
        select(StockMovement, Food, User.displayName)
        .join(StockItem, StockItem.id == StockMovement.stockItemId)
        .join(Food, Food.id == StockItem.foodId)
        .outerjoin(User, User.id == StockMovement.userId)
        .where(
            or_(
                StockMovement.storageLocationId == storageLocation.id,
                StockMovement.targetStorageLocationId == storageLocation.id,
            )
        )
        .order_by(StockMovement.createdAt.desc(), StockMovement.id.desc())
        .limit(limit)
    ).all()
    events = [
        movementEvent(movement, food, displayName, storageLocation.id) for movement, food, displayName in movementRows
    ]

    firstMoveIds = (
        select(func.min(StockMovement.id).label("id"))
        .where(StockMovement.reason == StockMovementReason.moved)
        .group_by(StockMovement.stockItemId)
        .subquery()
    )
    firstMoves = (
        select(StockMovement.stockItemId, StockMovement.storageLocationId)
        .join(firstMoveIds, firstMoveIds.c.id == StockMovement.id)
        .subquery()
    )
    quantityChanges = (
        select(StockMovement.stockItemId, func.sum(StockMovement.quantityChange).label("total"))
        .group_by(StockMovement.stockItemId)
        .subquery()
    )
    initialStorageLocationId = func.coalesce(firstMoves.c.storageLocationId, StockItem.storageLocationId)
    addedRows = session.execute(
        select(StockItem, Food, User.displayName, func.coalesce(quantityChanges.c.total, 0))
        .join(Food, Food.id == StockItem.foodId)
        .outerjoin(User, User.id == StockItem.createdByUserId)
        .outerjoin(firstMoves, firstMoves.c.stockItemId == StockItem.id)
        .outerjoin(quantityChanges, quantityChanges.c.stockItemId == StockItem.id)
        .where(Food.householdId == storageLocation.householdId, initialStorageLocationId == storageLocation.id)
        .order_by(StockItem.createdAt.desc(), StockItem.id.desc())
        .limit(limit)
    ).all()
    events.extend(
        StorageLocationHistoryEvent(
            kind="added",
            food=buildFoodResponse(food),
            quantity=stockItem.quantity - changes,
            userDisplayName=displayName,
            otherStorageLocationId=None,
            createdAt=stockItem.createdAt,
        )
        for stockItem, food, displayName, changes in addedRows
    )
    events.sort(key=lambda event: event.createdAt, reverse=True)
    return events[:limit]
