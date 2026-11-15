import math
from datetime import datetime, timezone
from decimal import Decimal

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import delete, or_, select
from sqlalchemy.orm import Session, aliased

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership, notFoundError
from application.foods import buildFoodResponse
from application.households import findMembership
from application.models import Food, HouseholdMember, Recipe, ShoppingListItem, User
from application.models.enumerations import MeasurementUnit
from application.recipes.availability import AvailabilityCalculator
from application.routers.recipes import getAccessibleRecipe, loadIngredients
from application.schemas.shopping import (
    AddedToShoppingListResponse,
    AddRecipeToShoppingListRequest,
    CreateShoppingListItemRequest,
    ShoppingListItemResponse,
    UpdateShoppingListItemRequest,
)

router = APIRouter(tags=["shopping list"])


def visibleTo(userId: int):
    return or_(ShoppingListItem.ownerUserId.is_(None), ShoppingListItem.ownerUserId == userId)


def loadItemResponses(session: Session, householdId: int, userId: int, itemIds: list[int] | None = None):
    creator = aliased(User)
    checker = aliased(User)
    query = (
        select(ShoppingListItem, Food, Recipe.name, creator.displayName, checker.displayName)
        .outerjoin(Food, Food.id == ShoppingListItem.foodId)
        .outerjoin(Recipe, Recipe.id == ShoppingListItem.recipeId)
        .outerjoin(creator, creator.id == ShoppingListItem.createdByUserId)
        .outerjoin(checker, checker.id == ShoppingListItem.checkedByUserId)
        .where(ShoppingListItem.householdId == householdId, visibleTo(userId))
        .order_by(ShoppingListItem.checkedAt.is_not(None), ShoppingListItem.createdAt, ShoppingListItem.id)
    )
    if itemIds is not None:
        query = query.where(ShoppingListItem.id.in_(itemIds))
    return [
        ShoppingListItemResponse(
            id=item.id,
            food=buildFoodResponse(food) if food else None,
            name=food.name if food else item.name,
            quantity=item.quantity,
            note=item.note,
            isPersonal=item.ownerUserId is not None,
            isChecked=item.checkedAt is not None,
            recipeId=item.recipeId,
            recipeName=recipeName,
            createdByDisplayName=createdBy,
            checkedByDisplayName=checkedBy,
            createdAt=item.createdAt,
        )
        for item, food, recipeName, createdBy, checkedBy in session.execute(query).all()
    ]


def addFoodItem(
    session: Session,
    householdId: int,
    userId: int,
    food: Food,
    quantity: Decimal | None,
    isPersonal: bool,
    note: str | None = None,
    recipeId: int | None = None,
) -> ShoppingListItem:
    ownerUserId = userId if isPersonal else None
    existing = session.scalar(
        select(ShoppingListItem).where(
            ShoppingListItem.householdId == householdId,
            ShoppingListItem.foodId == food.id,
            ShoppingListItem.checkedAt.is_(None),
            (
                ShoppingListItem.ownerUserId.is_(None)
                if ownerUserId is None
                else ShoppingListItem.ownerUserId == ownerUserId
            ),
        )
    )
    if existing is not None:
        if quantity is not None:
            existing.quantity = (existing.quantity or Decimal(0)) + quantity
        if note:
            existing.note = note
        return existing
    item = ShoppingListItem(
        householdId=householdId,
        ownerUserId=ownerUserId,
        foodId=food.id,
        name=food.name,
        quantity=quantity,
        note=note,
        recipeId=recipeId,
        createdByUserId=userId,
    )
    session.add(item)
    return item


def getAccessibleItem(
    itemId: int, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> ShoppingListItem:
    item = session.get(ShoppingListItem, itemId)
    if (
        item is None
        or findMembership(session, user.id, item.householdId) is None
        or item.ownerUserId not in (None, user.id)
    ):
        raise notFoundError("Shopping list item")
    return item


@router.get("/households/{householdId}/shopping-list", response_model=list[ShoppingListItemResponse])
def listShoppingList(
    membership: HouseholdMember = Depends(getHouseholdMembership), session: Session = Depends(getDatabaseSession)
) -> list[ShoppingListItemResponse]:
    return loadItemResponses(session, membership.householdId, membership.userId)


@router.post(
    "/households/{householdId}/shopping-list",
    response_model=ShoppingListItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def addShoppingListItem(
    request: CreateShoppingListItemRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> ShoppingListItemResponse:
    if request.foodId is not None:
        food = session.get(Food, request.foodId)
        if food is None or food.householdId != membership.householdId:
            raise notFoundError("Food")
        item = addFoodItem(
            session,
            membership.householdId,
            membership.userId,
            food,
            request.quantity,
            request.isPersonal,
            request.note,
        )
    else:
        item = ShoppingListItem(
            householdId=membership.householdId,
            ownerUserId=membership.userId if request.isPersonal else None,
            name=request.name,
            note=request.note,
            createdByUserId=membership.userId,
        )
        session.add(item)
    session.commit()
    return loadItemResponses(session, membership.householdId, membership.userId, [item.id])[0]


@router.post("/recipes/{recipeId}/shopping-list", response_model=AddedToShoppingListResponse)
def addMissingIngredientsToShoppingList(
    request: AddRecipeToShoppingListRequest,
    recipe: Recipe = Depends(getAccessibleRecipe),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> AddedToShoppingListResponse:
    ingredients = loadIngredients(session, [recipe.id])[recipe.id]
    foodsById = {food.id: food for _, food in ingredients}
    availability = AvailabilityCalculator(session, recipe.householdId, user.id).calculate(
        recipe, ingredients, request.servings
    )
    itemIds = []
    for ingredient in availability.ingredients:
        if ingredient.isOptional or ingredient.missingQuantity <= 0:
            continue
        missing = ingredient.missingQuantity
        if ingredient.food.baseUnit == MeasurementUnit.piece:
            missing = Decimal(math.ceil(missing))
        food = foodsById[ingredient.food.id]
        item = addFoodItem(
            session, recipe.householdId, user.id, food, missing, request.isPersonal, recipeId=recipe.id
        )
        session.flush()
        itemIds.append(item.id)
    session.commit()
    return AddedToShoppingListResponse(
        addedCount=len(itemIds), items=loadItemResponses(session, recipe.householdId, user.id, itemIds)
    )


@router.patch("/shopping-list-items/{itemId}", response_model=ShoppingListItemResponse)
def updateShoppingListItem(
    request: UpdateShoppingListItemRequest,
    item: ShoppingListItem = Depends(getAccessibleItem),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> ShoppingListItemResponse:
    if "quantity" in request.model_fields_set:
        item.quantity = request.quantity
    if "note" in request.model_fields_set:
        item.note = request.note or None
    if request.isChecked is not None:
        item.checkedAt = datetime.now(timezone.utc) if request.isChecked else None
        item.checkedByUserId = user.id if request.isChecked else None
    if request.isPersonal is not None:
        item.ownerUserId = user.id if request.isPersonal else None
    session.commit()
    return loadItemResponses(session, item.householdId, user.id, [item.id])[0]


@router.delete("/shopping-list-items/{itemId}", status_code=status.HTTP_204_NO_CONTENT)
def deleteShoppingListItem(
    item: ShoppingListItem = Depends(getAccessibleItem), session: Session = Depends(getDatabaseSession)
) -> Response:
    session.delete(item)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/households/{householdId}/shopping-list/checked", status_code=status.HTTP_204_NO_CONTENT)
def deleteCheckedItems(
    membership: HouseholdMember = Depends(getHouseholdMembership), session: Session = Depends(getDatabaseSession)
) -> Response:
    session.execute(
        delete(ShoppingListItem).where(
            ShoppingListItem.householdId == membership.householdId,
            ShoppingListItem.checkedAt.is_not(None),
            visibleTo(membership.userId),
        )
    )
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
