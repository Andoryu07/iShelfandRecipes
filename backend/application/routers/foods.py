from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getAccessibleFood, getHouseholdMembership
from application.foods import buildFoodResponse, escapeLikePattern, foodIsInUse
from application.models import Food, HouseholdMember
from application.schemas.foods import CreateFoodRequest, FoodResponse, UpdateFoodRequest

router = APIRouter(tags=["foods"])
searchResultLimit = 50


def duplicateFoodError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_409_CONFLICT, detail="A food with this name already exists")


@router.get("/households/{householdId}/foods", response_model=list[FoodResponse])
def listFoods(
    search: str | None = Query(default=None, max_length=100),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[FoodResponse]:
    query = select(Food).where(Food.householdId == membership.householdId).order_by(func.lower(Food.name))
    if search and search.strip():
        pattern = f"%{escapeLikePattern(search.strip())}%"
        query = query.where(func.unaccent(Food.name).ilike(func.unaccent(pattern), escape="\\")).limit(
            searchResultLimit
        )
    return [buildFoodResponse(food) for food in session.scalars(query)]


@router.post("/households/{householdId}/foods", response_model=FoodResponse, status_code=status.HTTP_201_CREATED)
def createFood(
    request: CreateFoodRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> FoodResponse:
    food = Food(
        householdId=membership.householdId,
        name=request.name,
        category=request.category.value,
        baseUnit=request.baseUnit,
    )
    session.add(food)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise duplicateFoodError()
    return buildFoodResponse(food)


@router.patch("/foods/{foodId}", response_model=FoodResponse)
def updateFood(
    request: UpdateFoodRequest,
    food: Food = Depends(getAccessibleFood),
    session: Session = Depends(getDatabaseSession),
) -> FoodResponse:
    if request.baseUnit is not None and request.baseUnit != food.baseUnit:
        if foodIsInUse(session, food.id):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="The unit of a food that is already in stock or in a recipe cannot be changed",
            )
        food.baseUnit = request.baseUnit
    if request.name is not None:
        food.name = request.name
    if request.category is not None:
        food.category = request.category.value
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise duplicateFoodError()
    return buildFoodResponse(food)
