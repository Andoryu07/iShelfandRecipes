import hashlib
import hmac

from sqlalchemy import exists, select, update
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.models import Food, RecipeIngredient, StockItem
from application.models.enumerations import FoodCategory
from application.schemas.foods import FoodResponse, NewFoodRequest


def foodPhotoSignature(foodId: int, version: int) -> str:
    message = f"food-photo:{foodId}:{version}".encode()
    return hmac.new(getConfiguration().jsonWebTokenSecret.encode(), message, hashlib.sha256).hexdigest()[:32]


def foodPhotoUrl(food: Food) -> str | None:
    if food.photoUpdatedAt is None:
        return None
    version = int(food.photoUpdatedAt.timestamp() * 1000)
    return f"/foods/{food.id}/photo?version={version}&signature={foodPhotoSignature(food.id, version)}"


def assignBarcode(session: Session, food: Food, barcode: str | None) -> None:
    if barcode is not None:
        session.execute(
            update(Food)
            .where(Food.householdId == food.householdId, Food.barcode == barcode, Food.id != food.id)
            .values(barcode=None)
        )
        session.flush()
    food.barcode = barcode


def buildFoodResponse(food: Food) -> FoodResponse:
    return FoodResponse(
        id=food.id,
        name=food.name,
        genericName=food.genericName,
        category=FoodCategory(food.category) if food.category else FoodCategory.other,
        baseUnit=food.baseUnit,
        icon=food.icon,
        photoUrl=foodPhotoUrl(food),
        barcode=food.barcode,
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


class FoodNotFoundError(Exception):
    pass


class FoodResolver:
    def __init__(self, session: Session, householdId: int) -> None:
        self.session = session
        self.householdId = householdId
        self.foodsById = {food.id: food for food in session.scalars(select(Food).where(Food.householdId == householdId))}

    def findByName(self, name: str) -> Food | None:
        lowerName = name.lower()
        return next((food for food in self.foodsById.values() if food.name.lower() == lowerName), None)

    def resolve(self, foodId: int | None, newFood: NewFoodRequest | None) -> Food | None:
        if foodId is not None:
            food = self.foodsById.get(foodId)
            if food is None:
                raise FoodNotFoundError()
            return food
        if newFood is None:
            return None
        existing = self.findByName(newFood.name)
        if existing is not None:
            return existing
        food = Food(
            householdId=self.householdId,
            name=newFood.name,
            genericName=newFood.genericName or None,
            category=newFood.category.value,
            baseUnit=newFood.baseUnit,
        )
        self.session.add(food)
        self.session.flush()
        self.foodsById[food.id] = food
        return food
