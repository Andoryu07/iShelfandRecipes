from typing import Annotated, Literal

from pydantic import BaseModel, Field

NutritionValue = Annotated[float, Field(ge=0, le=1000)]
NutriscoreGrade = Literal["a", "b", "c", "d", "e"]
PieceWeight = Annotated[float, Field(gt=0, le=100000)]


class Nutrition(BaseModel):
    energyKcal: NutritionValue | None = None
    fat: NutritionValue | None = None
    saturatedFat: NutritionValue | None = None
    carbohydrates: NutritionValue | None = None
    sugars: NutritionValue | None = None
    proteins: NutritionValue | None = None
    fiber: NutritionValue | None = None
    salt: NutritionValue | None = None
