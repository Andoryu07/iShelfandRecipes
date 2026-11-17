from typing import Annotated

from pydantic import BaseModel, StringConstraints

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.common import FoodName, Icon, QuantityValue
from application.schemas.nutrition import NutriscoreGrade, Nutrition, PieceWeight


OptionalName = Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)]


Barcode = Annotated[str, StringConstraints(pattern=r"^\d{6,14}$")]

class CreateFoodRequest(BaseModel):
    name: FoodName
    genericName: OptionalName | None = None
    category: FoodCategory = FoodCategory.other
    baseUnit: MeasurementUnit
    icon: Icon | None = None
    barcode: Barcode | None = None
    nutrition: Nutrition | None = None
    nutriscoreGrade: NutriscoreGrade | None = None
    pieceWeightGrams: PieceWeight | None = None


class UpdateFoodRequest(BaseModel):
    name: FoodName | None = None
    genericName: OptionalName | None = None
    category: FoodCategory | None = None
    baseUnit: MeasurementUnit | None = None
    icon: Icon | None = None
    barcode: Barcode | None = None
    nutrition: Nutrition | None = None
    nutriscoreGrade: NutriscoreGrade | None = None
    pieceWeightGrams: PieceWeight | None = None


class FoodResponse(BaseModel):
    id: int
    name: str
    genericName: str | None
    category: FoodCategory
    baseUnit: MeasurementUnit
    icon: str | None
    photoUrl: str | None = None
    barcode: str | None = None
    nutrition: Nutrition | None = None
    nutriscoreGrade: str | None = None
    pieceWeightGrams: float | None = None


class LastAddedQuantityResponse(BaseModel):
    quantity: QuantityValue | None


class NewFoodRequest(BaseModel):
    name: FoodName
    genericName: OptionalName | None = None
    category: FoodCategory = FoodCategory.other
    baseUnit: MeasurementUnit
