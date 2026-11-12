from datetime import date, datetime, timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

from application.foods import buildFoodResponse
from application.models import Food, Reservation, StockItem, StorageLocation
from application.models.enumerations import ReservationStatus
from application.reservations import activeReservationsByStockItem
from application.schemas.reservations import ReservationResponse
from application.schemas.stock import StockItemResponse

householdTimeZone = ZoneInfo("Europe/Prague")


def todayInHouseholdTimeZone() -> date:
    return datetime.now(householdTimeZone).date()


def expirationLimit(expiringWithinDays: int) -> date:
    return todayInHouseholdTimeZone() + timedelta(days=expiringWithinDays)


def reservedQuantitySubquery():
    return (
        select(Reservation.stockItemId, func.sum(Reservation.quantity).label("reservedQuantity"))
        .where(Reservation.status == ReservationStatus.active)
        .group_by(Reservation.stockItemId)
        .subquery()
    )


def stockItemsQuery(householdId: int) -> Select:
    reserved = reservedQuantitySubquery()
    return (
        select(StockItem, Food, func.coalesce(reserved.c.reservedQuantity, 0).label("reservedQuantity"))
        .join(Food, Food.id == StockItem.foodId)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .outerjoin(reserved, reserved.c.stockItemId == StockItem.id)
        .where(StorageLocation.householdId == householdId)
    )


def buildStockItemResponse(
    stockItem: StockItem, food: Food, reservedQuantity: Decimal, reservations: list[ReservationResponse]
) -> StockItemResponse:
    reservedQuantity = Decimal(reservedQuantity)
    return StockItemResponse(
        id=stockItem.id,
        food=buildFoodResponse(food),
        storageLocationId=stockItem.storageLocationId,
        quantity=stockItem.quantity,
        reservedQuantity=reservedQuantity,
        availableQuantity=max(stockItem.quantity - reservedQuantity, Decimal(0)),
        expirationDate=stockItem.expirationDate,
        createdAt=stockItem.createdAt,
        reservations=reservations,
    )


def buildStockItemResponses(session: Session, rows) -> list[StockItemResponse]:
    rows = list(rows)
    reservations = activeReservationsByStockItem(session, [row.StockItem.id for row in rows])
    return [
        buildStockItemResponse(row.StockItem, row.Food, row.reservedQuantity, reservations[row.StockItem.id])
        for row in rows
    ]


def loadStockItemResponse(session: Session, householdId: int, stockItemId: int) -> StockItemResponse:
    return buildStockItemResponses(session, session.execute(stockItemsQuery(householdId).where(StockItem.id == stockItemId)))[0]


def findHouseholdStorageLocation(session: Session, householdId: int, storageLocationId: int) -> StorageLocation | None:
    storageLocation = session.get(StorageLocation, storageLocationId)
    return storageLocation if storageLocation and storageLocation.householdId == householdId else None


def householdIdOfStockItem(session: Session, stockItem: StockItem) -> int:
    return session.get(StorageLocation, stockItem.storageLocationId).householdId
