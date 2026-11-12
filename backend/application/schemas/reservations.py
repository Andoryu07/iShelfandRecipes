from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, StringConstraints

from application.models.enumerations import ReservationStatus
from application.schemas.common import PositiveQuantity, QuantityValue

Note = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class CreateReservationRequest(BaseModel):
    stockItemId: int
    quantity: PositiveQuantity
    recipeId: int | None = None
    note: Note | None = None


class UpdateReservationRequest(BaseModel):
    quantity: PositiveQuantity | None = None
    note: Note | None = None


class ReservationResponse(BaseModel):
    id: int
    stockItemId: int
    foodName: str
    userId: int
    userDisplayName: str
    recipeId: int | None
    quantity: QuantityValue
    note: str | None
    status: ReservationStatus
    createdAt: datetime
