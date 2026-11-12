from collections import defaultdict
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.models import Food, Reservation, StockItem, User
from application.models.enumerations import ReservationStatus
from application.schemas.reservations import ReservationResponse


def reservationsQuery():
    return (
        select(Reservation, Food.name.label("foodName"), User.displayName)
        .join(StockItem, StockItem.id == Reservation.stockItemId)
        .join(Food, Food.id == StockItem.foodId)
        .join(User, User.id == Reservation.userId)
    )


def buildReservationResponse(reservation: Reservation, foodName: str, displayName: str) -> ReservationResponse:
    return ReservationResponse(
        id=reservation.id,
        stockItemId=reservation.stockItemId,
        foodName=foodName,
        userId=reservation.userId,
        userDisplayName=displayName,
        recipeId=reservation.recipeId,
        quantity=reservation.quantity,
        note=reservation.note,
        status=reservation.status,
        createdAt=reservation.createdAt,
    )


def activeReservationsByStockItem(session: Session, stockItemIds: list[int]) -> dict[int, list[ReservationResponse]]:
    grouped: dict[int, list[ReservationResponse]] = defaultdict(list)
    if not stockItemIds:
        return grouped
    rows = session.execute(
        reservationsQuery()
        .where(Reservation.stockItemId.in_(stockItemIds), Reservation.status == ReservationStatus.active)
        .order_by(Reservation.createdAt, Reservation.id)
    ).all()
    for reservation, foodName, displayName in rows:
        grouped[reservation.stockItemId].append(buildReservationResponse(reservation, foodName, displayName))
    return grouped


def activeReservations(session: Session, stockItemId: int) -> list[Reservation]:
    return list(
        session.scalars(
            select(Reservation)
            .where(Reservation.stockItemId == stockItemId, Reservation.status == ReservationStatus.active)
            .order_by(Reservation.createdAt.desc(), Reservation.id.desc())
            .with_for_update()
        )
    )


def reservedQuantity(reservations: list[Reservation], excludedUserId: int | None = None) -> Decimal:
    return sum(
        (reservation.quantity for reservation in reservations if reservation.userId != excludedUserId),
        Decimal(0),
    )


def trimReservations(
    reservations: list[Reservation], remainingQuantity: Decimal, actingUserId: int, eatenByActingUser: bool
) -> None:
    excess = reservedQuantity(reservations) - remainingQuantity
    ownFirst = sorted(reservations, key=lambda reservation: reservation.userId != actingUserId)
    for reservation in ownFirst:
        if excess <= 0:
            return
        reduction = min(excess, reservation.quantity)
        excess -= reduction
        if reduction == reservation.quantity:
            isOwnMeal = eatenByActingUser and reservation.userId == actingUserId
            reservation.status = ReservationStatus.fulfilled if isOwnMeal else ReservationStatus.cancelled
        else:
            reservation.quantity -= reduction
