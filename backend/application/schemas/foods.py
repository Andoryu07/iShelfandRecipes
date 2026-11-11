from pydantic import BaseModel

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.common import RequiredName


class CreateFoodRequest(BaseModel):
    name: RequiredName
    category: FoodCategory = FoodCategory.other
    baseUnit: MeasurementUnit


class UpdateFoodRequest(BaseModel):
    name: RequiredName | None = None
    category: FoodCategory | None = None
    baseUnit: MeasurementUnit | None = None


class FoodResponse(BaseModel):
    id: int
    name: str
    category: FoodCategory
    baseUnit: MeasurementUnit
