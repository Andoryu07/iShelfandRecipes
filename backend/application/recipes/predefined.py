from decimal import Decimal
from functools import lru_cache
from pathlib import Path

from pydantic import BaseModel
from sqlalchemy.orm import Session

from application.foods import FoodResolver
from application.models import Recipe, RecipeIngredient
from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.foods import NewFoodRequest


class PredefinedFood(BaseModel):
    name: str
    genericName: str
    category: FoodCategory
    baseUnit: MeasurementUnit


class PredefinedIngredient(BaseModel):
    food: str
    quantity: Decimal
    acceptsAnyOfKind: bool = True
    isOptional: bool = False


class PredefinedRecipe(BaseModel):
    name: str
    servings: int
    preparationMinutes: int
    instructions: str
    ingredients: list[PredefinedIngredient]


class PredefinedData(BaseModel):
    foods: list[PredefinedFood]
    recipes: list[PredefinedRecipe]


@lru_cache
def loadPredefinedData() -> PredefinedData:
    return PredefinedData.model_validate_json((Path(__file__).parent / "predefined.json").read_text(encoding="utf-8"))


def copyPredefinedRecipes(session: Session, householdId: int) -> None:
    data = loadPredefinedData()
    foodResolver = FoodResolver(session, householdId)
    foodsByName = {
        food.name: foodResolver.resolve(
            None,
            NewFoodRequest(
                name=food.name, genericName=food.genericName, category=food.category, baseUnit=food.baseUnit
            ),
        )
        for food in data.foods
    }
    for predefined in data.recipes:
        recipe = Recipe(
            householdId=householdId,
            name=predefined.name,
            servings=predefined.servings,
            preparationMinutes=predefined.preparationMinutes,
            instructions=predefined.instructions,
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
                )
            )
    session.flush()
