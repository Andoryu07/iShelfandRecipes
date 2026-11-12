from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, model_validator

from application.models.enumerations import StockMovementReason
from application.schemas.common import NonNegativeQuantity, PositiveQuantity, QuantityValue
from application.schemas.foods import FoodResponse
from application.schemas.reservations import ReservationResponse


class CreateStockItemRequest(BaseModel):
    foodId: int
    storageLocationId: int
    quantity: PositiveQuantity
    expirationDate: date | None = None


class UpdateStockItemRequest(BaseModel):
    storageLocationId: int | None = None
    expirationDate: date | None = None


class CreateStockMovementRequest(BaseModel):
    reason: StockMovementReason
    quantity: PositiveQuantity | None = None
    newQuantity: NonNegativeQuantity | None = None

    @model_validator(mode="after")
    def checkQuantityMatchesReason(self) -> Self:
        if self.reason == StockMovementReason.cooked:
            raise ValueError("Cooked movements are recorded only by cooking a recipe")
        if self.reason == StockMovementReason.correction:
            if self.newQuantity is None or self.quantity is not None:
                raise ValueError("A correction needs newQuantity and no quantity")
        elif self.quantity is None or self.newQuantity is not None:
            raise ValueError("A write-off needs quantity and no newQuantity")
        return self


class StockItemResponse(BaseModel):
    id: int
    food: FoodResponse
    storageLocationId: int
    quantity: QuantityValue
    reservedQuantity: QuantityValue
    availableQuantity: QuantityValue
    expirationDate: date | None
    createdAt: datetime
    reservations: list[ReservationResponse]


class StockMovementResponse(BaseModel):
    id: int
    quantityChange: QuantityValue
    reason: StockMovementReason
    userId: int | None
    userDisplayName: str | None
    createdAt: datetime
