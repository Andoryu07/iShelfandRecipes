from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, Field, model_validator

from application.models.enumerations import DishType, FoodCategory, MeasurementUnit
from application.schemas.common import Icon, PositiveQuantity, QuantityValue, RequiredName
from application.schemas.foods import FoodResponse, NewFoodRequest
from application.plans import ScanPeriod

Servings = Annotated[int, Field(ge=1, le=100)]
PreparationMinutes = Annotated[int, Field(ge=1, le=2880)]
Instructions = Annotated[str, Field(max_length=20000)]


class RecipeIngredientRequest(BaseModel):
    foodId: int | None = None
    newFood: NewFoodRequest | None = None
    quantity: PositiveQuantity
    acceptsAnyOfKind: bool = True
    isOptional: bool = False
    isForFrying: bool = False

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
    icon: Icon | None = None
    dishType: DishType | None = None
    isVegetarian: bool = False
    ingredients: list[RecipeIngredientRequest] = Field(max_length=100)


class UpdateRecipeRequest(BaseModel):
    name: RequiredName | None = None
    servings: Servings | None = None
    preparationMinutes: PreparationMinutes | None = None
    instructions: Instructions | None = None
    icon: Icon | None = None
    dishType: DishType | None = None
    isVegetarian: bool | None = None
    ingredients: list[RecipeIngredientRequest] | None = Field(default=None, max_length=100)


class RecipeIngredientResponse(BaseModel):
    id: int
    food: FoodResponse
    quantity: QuantityValue
    acceptsAnyOfKind: bool
    isOptional: bool
    isForFrying: bool = False


class RecipeSummaryResponse(BaseModel):
    id: int
    name: str
    servings: int
    preparationMinutes: int | None
    isPredefined: bool
    isFavourite: bool = False
    icon: str | None
    dishType: DishType | None = None
    isVegetarian: bool = False
    missingCount: int
    expiringIngredientCount: int = 0
    estimatedPrice: QuantityValue | None = None
    createdAt: datetime


class RecipeResponse(RecipeSummaryResponse):
    instructions: str
    ingredients: list[RecipeIngredientResponse]


class IngredientAvailabilityResponse(BaseModel):
    ingredientId: int
    food: FoodResponse
    acceptsAnyOfKind: bool
    isOptional: bool
    isForFrying: bool = False
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


class RecipeCookingResponse(BaseModel):
    id: int
    servings: int
    userDisplayName: str | None
    createdAt: datetime


class HouseholdCookingResponse(BaseModel):
    id: int
    recipeId: int | None
    recipeName: str
    recipeIcon: str | None
    recipeIsPredefined: bool
    servings: int
    userDisplayName: str | None
    createdAt: datetime


class CookRecipeResponse(BaseModel):
    servings: int
    ingredients: list[CookedIngredientResponse]


class ScannedIngredient(BaseModel):
    originalText: str
    name: str
    genericName: str | None
    category: FoodCategory
    quantity: QuantityValue | None
    unit: MeasurementUnit | None
    isOptional: bool
    isForFrying: bool = False
    suggestedFood: FoodResponse | None


class ScanRecipeResponse(BaseModel):
    name: str
    servings: int
    preparationMinutes: int | None
    dishType: DishType | None
    isVegetarian: bool
    instructions: str
    ingredients: list[ScannedIngredient]
    usedScans: int
    scanLimit: int
    scanPeriod: ScanPeriod


class RecipeScanAllowanceResponse(BaseModel):
    usedScans: int
    scanLimit: int
    scanPeriod: ScanPeriod
