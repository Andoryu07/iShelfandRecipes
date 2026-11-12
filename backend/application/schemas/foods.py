from typing import Annotated

from pydantic import BaseModel, StringConstraints

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.common import RequiredName


OptionalName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


class CreateFoodRequest(BaseModel):
    name: RequiredName
    genericName: OptionalName | None = None
    category: FoodCategory = FoodCategory.other
    baseUnit: MeasurementUnit


class UpdateFoodRequest(BaseModel):
    name: RequiredName | None = None
    genericName: OptionalName | None = None
    category: FoodCategory | None = None
    baseUnit: MeasurementUnit | None = None


class FoodResponse(BaseModel):
    id: int
    name: str
    genericName: str | None
    category: FoodCategory
    baseUnit: MeasurementUnit
