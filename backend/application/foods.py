from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from application.models import Food, RecipeIngredient, StockItem
from application.models.enumerations import FoodCategory
from application.schemas.foods import FoodResponse


def buildFoodResponse(food: Food) -> FoodResponse:
    return FoodResponse(
        id=food.id,
        name=food.name,
        genericName=food.genericName,
        category=FoodCategory(food.category) if food.category else FoodCategory.other,
        baseUnit=food.baseUnit,
    )


def foodIsInUse(session: Session, foodId: int) -> bool:
    return bool(
        session.scalar(
            select(
                exists().where(StockItem.foodId == foodId) | exists().where(RecipeIngredient.foodId == foodId)
            )
        )
    )


def escapeLikePattern(searchText: str) -> str:
    return searchText.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
