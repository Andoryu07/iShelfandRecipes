from typing import Annotated

from pydantic import BaseModel, StringConstraints

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.common import FoodName


OptionalName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


class CreateFoodRequest(BaseModel):
    name: FoodName
    genericName: OptionalName | None = None
    category: FoodCategory = FoodCategory.other
    baseUnit: MeasurementUnit


class UpdateFoodRequest(BaseModel):
    name: FoodName | None = None
    genericName: OptionalName | None = None
    category: FoodCategory | None = None
    baseUnit: MeasurementUnit | None = None


class FoodResponse(BaseModel):
    id: int
    name: str
    genericName: str | None
    category: FoodCategory
    baseUnit: MeasurementUnit


class NewFoodRequest(BaseModel):
    name: FoodName
    genericName: OptionalName | None = None
    category: FoodCategory = FoodCategory.other
    baseUnit: MeasurementUnit
