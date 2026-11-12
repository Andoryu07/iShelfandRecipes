from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getAccessibleStockItem, getCurrentUser, getHouseholdMembership, notFoundError
from application.foods import escapeLikePattern
from application.models import Food, HouseholdMember, StockItem, StockMovement, User
from application.models.enumerations import StockMovementReason
from application.schemas.stock import (
    CreateStockItemRequest,
    CreateStockMovementRequest,
    StockItemResponse,
    StockMovementResponse,
    UpdateStockItemRequest,
)
from application.reservations import activeReservations, reservedQuantity, trimReservations
from application.stock import (
    buildStockItemResponses,
    expirationLimit,
    findHouseholdStorageLocation,
    householdIdOfStockItem,
    loadStockItemResponse,
    stockItemsQuery,
)

router = APIRouter(tags=["stock"])


@router.get("/households/{householdId}/stock-items", response_model=list[StockItemResponse])
def listStockItems(
    storageLocationId: int | None = None,
    expiringWithinDays: int | None = Query(default=None, ge=0, le=3650),
    search: str | None = Query(default=None, max_length=100),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[StockItemResponse]:
    query = stockItemsQuery(membership.householdId).where(StockItem.quantity > 0)
    if storageLocationId is not None:
        query = query.where(StockItem.storageLocationId == storageLocationId)
    if expiringWithinDays is not None:
        query = query.where(StockItem.expirationDate <= expirationLimit(expiringWithinDays))
    if search and search.strip():
        pattern = f"%{escapeLikePattern(search.strip())}%"
        query = query.where(func.unaccent(Food.name).ilike(func.unaccent(pattern), escape="\\"))
    query = query.order_by(
        StockItem.expirationDate.asc().nulls_last(), func.lower(Food.name), StockItem.id
    )
    return buildStockItemResponses(session, session.execute(query))


@router.post(
    "/households/{householdId}/stock-items", response_model=StockItemResponse, status_code=status.HTTP_201_CREATED
)
def createStockItem(
    request: CreateStockItemRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> StockItemResponse:
    food = session.get(Food, request.foodId)
    if food is None or food.householdId != membership.householdId:
        raise notFoundError("Food")
    if findHouseholdStorageLocation(session, membership.householdId, request.storageLocationId) is None:
        raise notFoundError("Storage location")
    stockItem = StockItem(
        storageLocationId=request.storageLocationId,
        foodId=food.id,
        quantity=request.quantity,
        expirationDate=request.expirationDate,
    )
    session.add(stockItem)
    session.commit()
    return loadStockItemResponse(session, membership.householdId, stockItem.id)


@router.patch("/stock-items/{stockItemId}", response_model=StockItemResponse)
def updateStockItem(
    request: UpdateStockItemRequest,
    stockItem: StockItem = Depends(getAccessibleStockItem),
    session: Session = Depends(getDatabaseSession),
) -> StockItemResponse:
    householdId = householdIdOfStockItem(session, stockItem)
    if request.storageLocationId is not None:
        if findHouseholdStorageLocation(session, householdId, request.storageLocationId) is None:
            raise notFoundError("Storage location")
        stockItem.storageLocationId = request.storageLocationId
    if "expirationDate" in request.model_fields_set:
        stockItem.expirationDate = request.expirationDate
    session.commit()
    return loadStockItemResponse(session, householdId, stockItem.id)


@router.get("/stock-items/{stockItemId}/movements", response_model=list[StockMovementResponse])
def listStockMovements(
    stockItem: StockItem = Depends(getAccessibleStockItem),
    session: Session = Depends(getDatabaseSession),
) -> list[StockMovementResponse]:
    rows = session.execute(
        select(StockMovement, User.displayName)
        .outerjoin(User, User.id == StockMovement.userId)
        .where(StockMovement.stockItemId == stockItem.id)
        .order_by(StockMovement.createdAt.desc(), StockMovement.id.desc())
    ).all()
    return [
        StockMovementResponse(
            id=movement.id,
            quantityChange=movement.quantityChange,
            reason=movement.reason,
            userId=movement.userId,
            userDisplayName=displayName,
            createdAt=movement.createdAt,
        )
        for movement, displayName in rows
    ]


@router.post(
    "/stock-items/{stockItemId}/movements", response_model=StockItemResponse, status_code=status.HTTP_201_CREATED
)
def createStockMovement(
    request: CreateStockMovementRequest,
    stockItem: StockItem = Depends(getAccessibleStockItem),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> StockItemResponse:
    householdId = householdIdOfStockItem(session, stockItem)
    lockedStockItem = session.scalar(
        select(StockItem).where(StockItem.id == stockItem.id).with_for_update().execution_options(populate_existing=True)
    )
    reservations = activeReservations(session, lockedStockItem.id)
    if request.reason == StockMovementReason.correction:
        quantityChange = request.newQuantity - lockedStockItem.quantity
        if quantityChange == 0:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The quantity is already the same")
    else:
        if request.quantity > lockedStockItem.quantity:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Cannot write off more than the remaining quantity"
            )
        reservedByOthers = reservedQuantity(reservations, excludedUserId=user.id)
        if request.reason == StockMovementReason.eaten and request.quantity > lockedStockItem.quantity - reservedByOthers:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Part of the quantity is reserved by someone else"
            )
        quantityChange = -request.quantity
    lockedStockItem.quantity += quantityChange
    trimReservations(
        reservations, lockedStockItem.quantity, user.id, eatenByActingUser=request.reason == StockMovementReason.eaten
    )
    session.add(
        StockMovement(stockItemId=lockedStockItem.id, userId=user.id, quantityChange=quantityChange, reason=request.reason)
    )
    session.commit()
    return loadStockItemResponse(session, householdId, lockedStockItem.id)
