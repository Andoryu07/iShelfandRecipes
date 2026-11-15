from datetime import datetime
from typing import Annotated, Self

from pydantic import BaseModel, StringConstraints, model_validator

from application.schemas.common import PositiveQuantity, QuantityValue
from application.schemas.foods import FoodResponse
from application.schemas.recipes import Servings

ItemName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
ItemNote = Annotated[str, StringConstraints(strip_whitespace=True, max_length=200)]


class CreateShoppingListItemRequest(BaseModel):
    foodId: int | None = None
    name: ItemName | None = None
    quantity: PositiveQuantity | None = None
    note: ItemNote | None = None
    isPersonal: bool = False

    @model_validator(mode="after")
    def checkFoodOrName(self) -> Self:
        if (self.foodId is None) == (self.name is None):
            raise ValueError("Use exactly one of foodId and name")
        return self


class UpdateShoppingListItemRequest(BaseModel):
    quantity: PositiveQuantity | None = None
    note: ItemNote | None = None
    isChecked: bool | None = None
    isPersonal: bool | None = None


class AddRecipeToShoppingListRequest(BaseModel):
    servings: Servings | None = None
    isPersonal: bool = False


class ShoppingListItemResponse(BaseModel):
    id: int
    food: FoodResponse | None
    name: str
    quantity: QuantityValue | None
    note: str | None
    isPersonal: bool
    isChecked: bool
    recipeId: int | None
    recipeName: str | None
    createdByDisplayName: str | None
    checkedByDisplayName: str | None
    createdAt: datetime


class AddedToShoppingListResponse(BaseModel):
    addedCount: int
    items: list[ShoppingListItemResponse]
