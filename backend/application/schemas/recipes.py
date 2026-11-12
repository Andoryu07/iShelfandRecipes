from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, model_validator

from application.schemas.common import PositiveQuantity, QuantityValue, RequiredName
from application.schemas.foods import FoodResponse, NewFoodRequest

Servings = Annotated[int, Field(ge=1, le=100)]
PreparationMinutes = Annotated[int, Field(ge=1, le=2880)]
Instructions = Annotated[str, Field(max_length=20000)]


class RecipeIngredientRequest(BaseModel):
    foodId: int | None = None
    newFood: NewFoodRequest | None = None
    quantity: PositiveQuantity
    acceptsAnyOfKind: bool = True
    isOptional: bool = False

    @model_validator(mode="after")
    def checkFood(self) -> Self:
        if (self.foodId is None) == (self.newFood is None):
            raise ValueError("Use exactly one of foodId and newFood")
        return self


class CreateRecipeRequest(BaseModel):
    name: RequiredName
    servings: Servings
    preparationMinutes: PreparationMinutes | None = None
    instructions: Instructions = ""
    ingredients: list[RecipeIngredientRequest] = Field(max_length=100)


class UpdateRecipeRequest(BaseModel):
    name: RequiredName | None = None
    servings: Servings | None = None
    preparationMinutes: PreparationMinutes | None = None
    instructions: Instructions | None = None
    ingredients: list[RecipeIngredientRequest] | None = Field(default=None, max_length=100)


class RecipeIngredientResponse(BaseModel):
    id: int
    food: FoodResponse
    quantity: QuantityValue
    acceptsAnyOfKind: bool
    isOptional: bool


class RecipeSummaryResponse(BaseModel):
    id: int
    name: str
    servings: int
    preparationMinutes: int | None
    isPredefined: bool
    missingCount: int
    createdAt: datetime


class RecipeResponse(RecipeSummaryResponse):
    instructions: str
    ingredients: list[RecipeIngredientResponse]


class IngredientAvailabilityResponse(BaseModel):
    ingredientId: int
    food: FoodResponse
    acceptsAnyOfKind: bool
    isOptional: bool
    requiredQuantity: QuantityValue
    availableQuantity: QuantityValue
    missingQuantity: QuantityValue
    reservedForRecipe: QuantityValue
    reservedByOthers: QuantityValue
    unitPrice: QuantityValue | None
    estimatedPrice: QuantityValue | None


class RecipeAvailabilityResponse(BaseModel):
    recipeId: int
    servings: int
    missingCount: int
    estimatedPrice: QuantityValue | None
    pricedIngredientCount: int
    requiredIngredientCount: int
    ingredients: list[IngredientAvailabilityResponse]


class ReserveRecipeRequest(BaseModel):
    servings: Servings | None = None


class CookRecipeRequest(BaseModel):
    servings: Servings | None = None


class CookedIngredientResponse(BaseModel):
    ingredientId: int
    food: FoodResponse
    isOptional: bool
    deductedQuantity: QuantityValue
    missingQuantity: QuantityValue


class CookRecipeResponse(BaseModel):
    servings: int
    ingredients: list[CookedIngredientResponse]
