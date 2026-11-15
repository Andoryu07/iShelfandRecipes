from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel, Field

from application.models.enumerations import DishType, FoodCategory, MeasurementUnit


class ExtractedIngredient(BaseModel):
    originalText: str = Field(description="The ingredient line exactly as printed, for example '2 lžíce hladké mouky'.")
    name: str = Field(
        description="A short Czech name of the food in the nominative, as specific as the text allows, "
        "for example 'Mouka hladká', 'Mléko', 'Vejce', 'Máslo'."
    )
    genericName: str = Field(description="The general kind in Czech, for example 'Mouka', 'Mléko', 'Vejce'.")
    category: FoodCategory
    quantity: float | None = Field(
        description="Amount converted to the base unit: grams, milliliters or pieces "
        "(1 kg = 1000 gram, 1 l = 1000 milliliter, 1 lžíce of a liquid = 15 milliliter, 1 lžička = 5 milliliter, "
        "1 hrnek = 250 milliliter). Null when the text gives no amount, for example 'sůl podle chuti'."
    )
    unit: MeasurementUnit | None = Field(description="Base unit of quantity, null if the quantity is null.")
    isOptional: bool = Field(description="True for 'podle chuti', 'na ozdobu', 'případně' and similar.")


class ExtractedRecipe(BaseModel):
    isRecipe: bool = Field(description="False when the pictures do not show a recipe at all.")
    name: str = Field(description="The name of the dish as printed.")
    servings: int | None = Field(description="Number of servings if printed, otherwise null.")
    preparationMinutes: int | None = Field(description="Total preparation time in minutes if printed, otherwise null.")
    dishType: DishType | None
    isVegetarian: bool = Field(description="True when no ingredient is meat, fish or seafood.")
    ingredients: list[ExtractedIngredient]
    steps: list[str] = Field(description="The method as separate steps in the printed order, in Czech.")


@dataclass(frozen=True)
class RecipeReadingResult:
    recipe: ExtractedRecipe
    processingMilliseconds: int
    inputTokens: int | None = None
    outputTokens: int | None = None


class RecipeReadingError(Exception):
    pass


class RecipeReader(Protocol):
    def readRecipe(self, files: list[tuple[bytes, str]]) -> RecipeReadingResult: ...
