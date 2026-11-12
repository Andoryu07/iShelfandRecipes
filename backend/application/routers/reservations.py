from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership, notFoundError
from application.households import findMembership
from application.models import HouseholdMember, Recipe, Reservation, StockItem, StorageLocation, User
from application.models.enumerations import ReservationStatus
from application.reservations import activeReservations, buildReservationResponse, reservationsQuery, reservedQuantity
from application.schemas.reservations import CreateReservationRequest, ReservationResponse, UpdateReservationRequest

router = APIRouter(tags=["reservations"])


def notEnoughFreeQuantityError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Not enough free quantity to reserve")


def lockHouseholdStockItem(session: Session, householdId: int, stockItemId: int) -> StockItem:
    stockItem = session.scalar(
        select(StockItem)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(StockItem.id == stockItemId, StorageLocation.householdId == householdId)
        .with_for_update(of=StockItem)
    )
    if stockItem is None:
        raise notFoundError("Stock item")
    return stockItem


def loadReservationResponse(session: Session, reservationId: int) -> ReservationResponse:
    reservation, foodName, displayName = session.execute(
        reservationsQuery().where(Reservation.id == reservationId)
    ).one()
    return buildReservationResponse(reservation, foodName, displayName)


def getOwnActiveReservation(
    reservationId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> Reservation:
    reservation = session.get(Reservation, reservationId)
    if reservation is None:
        raise notFoundError("Reservation")
    householdId = session.scalar(
        select(StorageLocation.householdId)
        .join(StockItem, StockItem.storageLocationId == StorageLocation.id)
        .where(StockItem.id == reservation.stockItemId)
    )
    if findMembership(session, user.id, householdId) is None:
        raise notFoundError("Reservation")
    if reservation.userId != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can change a reservation")
    if reservation.status != ReservationStatus.active:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The reservation is no longer active")
    return reservation


@router.get("/households/{householdId}/reservations", response_model=list[ReservationResponse])
def listReservations(
    reservationStatus: ReservationStatus | None = Query(default=None, alias="status"),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[ReservationResponse]:
    query = (
        reservationsQuery()
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(StorageLocation.householdId == membership.householdId)
        .order_by(Reservation.createdAt.desc(), Reservation.id.desc())
    )
    if reservationStatus is not None:
        query = query.where(Reservation.status == reservationStatus)
    return [buildReservationResponse(*row) for row in session.execute(query)]


@router.post(
    "/households/{householdId}/reservations", response_model=ReservationResponse, status_code=status.HTTP_201_CREATED
)
def createReservation(
    request: CreateReservationRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> ReservationResponse:
    stockItem = lockHouseholdStockItem(session, membership.householdId, request.stockItemId)
    if request.recipeId is not None:
        recipe = session.get(Recipe, request.recipeId)
        if recipe is None or recipe.householdId != membership.householdId:
            raise notFoundError("Recipe")
    if request.quantity > stockItem.quantity - reservedQuantity(activeReservations(session, stockItem.id)):
        raise notEnoughFreeQuantityError()
    reservation = Reservation(
        stockItemId=stockItem.id,
        userId=user.id,
        recipeId=request.recipeId,
        quantity=request.quantity,
        note=request.note or None,
    )
    session.add(reservation)
    session.commit()
    return loadReservationResponse(session, reservation.id)


@router.patch("/reservations/{reservationId}", response_model=ReservationResponse)
def updateReservation(
    request: UpdateReservationRequest,
    reservation: Reservation = Depends(getOwnActiveReservation),
    session: Session = Depends(getDatabaseSession),
) -> ReservationResponse:
    if request.quantity is not None:
        stockItem = session.scalar(select(StockItem).where(StockItem.id == reservation.stockItemId).with_for_update())
        reservedByOthers = sum(
            (other.quantity for other in activeReservations(session, stockItem.id) if other.id != reservation.id),
            start=Decimal(0),
        )
        if request.quantity > stockItem.quantity - reservedByOthers:
            raise notEnoughFreeQuantityError()
        reservation.quantity = request.quantity
    if "note" in request.model_fields_set:
        reservation.note = request.note or None
    session.commit()
    return loadReservationResponse(session, reservation.id)


@router.post("/reservations/{reservationId}/cancel", response_model=ReservationResponse)
def cancelReservation(
    reservation: Reservation = Depends(getOwnActiveReservation),
    session: Session = Depends(getDatabaseSession),
) -> ReservationResponse:
    reservation.status = ReservationStatus.cancelled
    session.commit()
    return loadReservationResponse(session, reservation.id)
