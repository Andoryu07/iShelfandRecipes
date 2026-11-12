from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership, notFoundError
from application.foods import FoodNotFoundError, FoodResolver, buildFoodResponse
from application.households import findMembership
from application.models import Food, HouseholdMember, Recipe, RecipeIngredient, Reservation, StockItem, StorageLocation, User
from application.recipes.availability import AvailabilityCalculator, scaledQuantity
from application.schemas.recipes import (
    CreateRecipeRequest,
    RecipeAvailabilityResponse,
    RecipeIngredientRequest,
    RecipeIngredientResponse,
    RecipeResponse,
    RecipeSummaryResponse,
    ReserveRecipeRequest,
    UpdateRecipeRequest,
)

router = APIRouter(tags=["recipes"])


def getAccessibleRecipe(
    recipeId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> Recipe:
    recipe = session.get(Recipe, recipeId)
    if recipe is None or findMembership(session, user.id, recipe.householdId) is None:
        raise notFoundError("Recipe")
    return recipe


def loadIngredients(session: Session, recipeIds: list[int]) -> dict[int, list[tuple[RecipeIngredient, Food]]]:
    grouped: dict[int, list[tuple[RecipeIngredient, Food]]] = {recipeId: [] for recipeId in recipeIds}
    rows = session.execute(
        select(RecipeIngredient, Food)
        .join(Food, Food.id == RecipeIngredient.foodId)
        .where(RecipeIngredient.recipeId.in_(recipeIds))
        .order_by(RecipeIngredient.id)
    ).all()
    for ingredient, food in rows:
        grouped[ingredient.recipeId].append((ingredient, food))
    return grouped


def buildRecipeResponse(recipe: Recipe, ingredients: list[tuple[RecipeIngredient, Food]], missingCount: int) -> RecipeResponse:
    return RecipeResponse(
        id=recipe.id,
        name=recipe.name,
        servings=recipe.servings,
        preparationMinutes=recipe.preparationMinutes,
        isPredefined=recipe.isPredefined,
        missingCount=missingCount,
        createdAt=recipe.createdAt,
        instructions=recipe.instructions,
        ingredients=[
            RecipeIngredientResponse(
                id=ingredient.id,
                food=buildFoodResponse(food),
                quantity=ingredient.quantity,
                acceptsAnyOfKind=ingredient.acceptsAnyOfKind,
                isOptional=ingredient.isOptional,
            )
            for ingredient, food in ingredients
        ],
    )


def recipeResponse(session: Session, recipe: Recipe, userId: int) -> RecipeResponse:
    ingredients = loadIngredients(session, [recipe.id])[recipe.id]
    availability = AvailabilityCalculator(session, recipe.householdId, userId).calculate(recipe, ingredients)
    return buildRecipeResponse(recipe, ingredients, availability.missingCount)


def replaceIngredients(session: Session, recipe: Recipe, requests: list[RecipeIngredientRequest]) -> None:
    foodResolver = FoodResolver(session, recipe.householdId)
    foods = []
    for index, request in enumerate(requests):
        try:
            foods.append(foodResolver.resolve(request.foodId, request.newFood))
        except FoodNotFoundError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Ingredient {index + 1}: food not found"
            )
    foodIds = [food.id for food in foods]
    if len(set(foodIds)) != len(foodIds):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Every food can be in a recipe only once"
        )
    for existing in session.scalars(select(RecipeIngredient).where(RecipeIngredient.recipeId == recipe.id)):
        session.delete(existing)
    session.flush()
    for request, food in zip(requests, foods):
        session.add(
            RecipeIngredient(
                recipeId=recipe.id,
                foodId=food.id,
                quantity=request.quantity,
                acceptsAnyOfKind=request.acceptsAnyOfKind,
                isOptional=request.isOptional,
            )
        )
    session.flush()


@router.get("/households/{householdId}/recipes", response_model=list[RecipeSummaryResponse])
def listRecipes(
    search: str | None = Query(default=None, max_length=100),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[RecipeSummaryResponse]:
    query = select(Recipe).where(Recipe.householdId == membership.householdId).order_by(func.lower(Recipe.name))
    if search and search.strip():
        query = query.where(func.unaccent(Recipe.name).ilike(func.unaccent(f"%{search.strip()}%")))
    recipes = list(session.scalars(query))
    ingredients = loadIngredients(session, [recipe.id for recipe in recipes])
    calculator = AvailabilityCalculator(session, membership.householdId, membership.userId)
    return [
        RecipeSummaryResponse(
            id=recipe.id,
            name=recipe.name,
            servings=recipe.servings,
            preparationMinutes=recipe.preparationMinutes,
            isPredefined=recipe.isPredefined,
            missingCount=calculator.calculate(recipe, ingredients[recipe.id]).missingCount,
            createdAt=recipe.createdAt,
        )
        for recipe in recipes
    ]


@router.post("/households/{householdId}/recipes", response_model=RecipeResponse, status_code=status.HTTP_201_CREATED)
def createRecipe(
    request: CreateRecipeRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> RecipeResponse:
    recipe = Recipe(
        householdId=membership.householdId,
        name=request.name,
        servings=request.servings,
        preparationMinutes=request.preparationMinutes,
        instructions=request.instructions,
    )
    session.add(recipe)
    session.flush()
    replaceIngredients(session, recipe, request.ingredients)
    session.commit()
    return recipeResponse(session, recipe, membership.userId)


@router.get("/recipes/{recipeId}", response_model=RecipeResponse)
def getRecipe(
    recipe: Recipe = Depends(getAccessibleRecipe),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> RecipeResponse:
    return recipeResponse(session, recipe, user.id)


@router.patch("/recipes/{recipeId}", response_model=RecipeResponse)
def updateRecipe(
    request: UpdateRecipeRequest,
    recipe: Recipe = Depends(getAccessibleRecipe),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> RecipeResponse:
    if request.name is not None:
        recipe.name = request.name
    if request.servings is not None:
        recipe.servings = request.servings
    if "preparationMinutes" in request.model_fields_set:
        recipe.preparationMinutes = request.preparationMinutes
    if request.instructions is not None:
        recipe.instructions = request.instructions
    if request.ingredients is not None:
        replaceIngredients(session, recipe, request.ingredients)
    session.commit()
    return recipeResponse(session, recipe, user.id)


@router.delete("/recipes/{recipeId}", status_code=status.HTTP_204_NO_CONTENT)
def deleteRecipe(
    recipe: Recipe = Depends(getAccessibleRecipe), session: Session = Depends(getDatabaseSession)
) -> Response:
    session.delete(recipe)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/recipes/{recipeId}/availability", response_model=RecipeAvailabilityResponse)
def getRecipeAvailability(
    servings: int | None = Query(default=None, ge=1, le=100),
    recipe: Recipe = Depends(getAccessibleRecipe),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> RecipeAvailabilityResponse:
    ingredients = loadIngredients(session, [recipe.id])[recipe.id]
    return AvailabilityCalculator(session, recipe.householdId, user.id).calculate(
        recipe, ingredients, servings, includePrices=True
    )


@router.post("/recipes/{recipeId}/reserve", response_model=RecipeAvailabilityResponse)
def reserveRecipeIngredients(
    request: ReserveRecipeRequest,
    recipe: Recipe = Depends(getAccessibleRecipe),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> RecipeAvailabilityResponse:
    session.execute(
        select(StockItem.id)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(StorageLocation.householdId == recipe.householdId, StockItem.quantity > 0)
        .order_by(StockItem.id)
        .with_for_update(of=StockItem)
    )
    servings = request.servings or recipe.servings
    ingredients = loadIngredients(session, [recipe.id])[recipe.id]
    calculator = AvailabilityCalculator(session, recipe.householdId, user.id)
    for ingredient, food in ingredients:
        if ingredient.isOptional:
            continue
        snapshots = calculator.matchingSnapshots(food, ingredient.acceptsAnyOfKind)
        alreadyReserved = sum(
            (
                reservation.quantity
                for snapshot in snapshots
                for reservation in snapshot.reservations
                if reservation.userId == user.id and reservation.recipeId == recipe.id
            ),
            Decimal(0),
        )
        stillNeeded = scaledQuantity(ingredient.quantity, recipe.servings, servings) - alreadyReserved
        for snapshot in snapshots:
            if stillNeeded <= 0:
                break
            free = snapshot.stockItem.quantity - sum(
                (reservation.quantity for reservation in snapshot.reservations), Decimal(0)
            )
            amount = min(free, stillNeeded)
            if amount <= 0:
                continue
            reservation = Reservation(
                stockItemId=snapshot.stockItem.id, userId=user.id, recipeId=recipe.id, quantity=amount
            )
            session.add(reservation)
            snapshot.reservations.append(reservation)
            stillNeeded -= amount
    session.commit()
    ingredients = loadIngredients(session, [recipe.id])[recipe.id]
    return AvailabilityCalculator(session, recipe.householdId, user.id).calculate(recipe, ingredients, servings)
