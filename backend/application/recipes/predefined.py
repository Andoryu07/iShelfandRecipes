from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel
from sqlalchemy.orm import Session

from application.foods import FoodResolver
from application.models import Recipe, RecipeIngredient
from application.models.enumerations import DishType, FoodCategory, MeasurementUnit
from application.nutrition import applyNutrition, nutritionOf
from application.schemas.foods import NewFoodRequest
from application.schemas.nutrition import Nutrition


class PredefinedFood(BaseModel):
    name: str
    genericName: str
    category: FoodCategory
    baseUnit: MeasurementUnit
    nutrition: Nutrition | None = None
    pieceWeightGrams: Decimal | None = None


class PredefinedIngredient(BaseModel):
    food: str
    quantity: Decimal
    acceptsAnyOfKind: bool = True
    isOptional: bool = False
    isForFrying: bool = False


class PredefinedRecipe(BaseModel):
    name: str
    servings: int
    preparationMinutes: int
    dishType: DishType
    isVegetarian: bool = False
    instructions: str
    ingredients: list[PredefinedIngredient]


class PredefinedData(BaseModel):
    foods: list[PredefinedFood]
    recipes: list[PredefinedRecipe]


@lru_cache
def loadPredefinedData() -> PredefinedData:
    return PredefinedData.model_validate_json((Path(__file__).parent / "predefined.json").read_text(encoding="utf-8"))


def fillPredefinedNutrition(food, predefinedFood: PredefinedFood) -> bool:
    if nutritionOf(food) is not None or predefinedFood.nutrition is None:
        return False
    applyNutrition(food, predefinedFood.nutrition)
    if food.pieceWeightGrams is None and food.baseUnit == predefinedFood.baseUnit:
        food.pieceWeightGrams = predefinedFood.pieceWeightGrams
    return True


def copyPredefinedRecipes(session: Session, householdId: int) -> None:
    data = loadPredefinedData()
    foodResolver = FoodResolver(session, householdId)
    foodsByName = {}
    for predefinedFood in data.foods:
        food = foodResolver.resolve(
            None,
            NewFoodRequest(
                name=predefinedFood.name,
                genericName=predefinedFood.genericName,
                category=predefinedFood.category,
                baseUnit=predefinedFood.baseUnit,
            ),
        )
        fillPredefinedNutrition(food, predefinedFood)
        foodsByName[predefinedFood.name] = food
    for predefined in data.recipes:
        recipe = Recipe(
            householdId=householdId,
            name=predefined.name,
            servings=predefined.servings,
            preparationMinutes=predefined.preparationMinutes,
            instructions=predefined.instructions,
            dishType=predefined.dishType,
            isVegetarian=predefined.isVegetarian,
            isPredefined=True,
        )
        session.add(recipe)
        session.flush()
        for ingredient in predefined.ingredients:
            session.add(
                RecipeIngredient(
                    recipeId=recipe.id,
                    foodId=foodsByName[ingredient.food].id,
                    quantity=ingredient.quantity,
                    acceptsAnyOfKind=ingredient.acceptsAnyOfKind,
                    isOptional=ingredient.isOptional,
                    isForFrying=ingredient.isForFrying,
                )
            )
    session.flush()
