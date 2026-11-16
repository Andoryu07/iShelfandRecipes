import hmac
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getAccessibleFood, getHouseholdMembership, notFoundError
from application.foods import buildFoodResponse, escapeLikePattern, foodIsInUse, foodPhotoSignature
from application.models import Food, HouseholdMember, StockItem, StockMovement
from application.models.enumerations import StockMovementReason
from application.schemas.foods import CreateFoodRequest, FoodResponse, LastAddedQuantityResponse, UpdateFoodRequest

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
        genericName=request.genericName or None,
        category=request.category.value,
        baseUnit=request.baseUnit,
        icon=request.icon,
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
    if "genericName" in request.model_fields_set:
        food.genericName = request.genericName or None
    if "icon" in request.model_fields_set:
        food.icon = request.icon
    if request.category is not None:
        food.category = request.category.value
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise duplicateFoodError()
    return buildFoodResponse(food)


@router.get("/foods/{foodId}/last-added-quantity", response_model=LastAddedQuantityResponse)
def getLastAddedQuantity(
    food: Food = Depends(getAccessibleFood), session: Session = Depends(getDatabaseSession)
) -> LastAddedQuantityResponse:
    stockItem = session.scalar(
        select(StockItem)
        .where(StockItem.foodId == food.id)
        .order_by(StockItem.createdAt.desc(), StockItem.id.desc())
        .limit(1)
    )
    if stockItem is None:
        return LastAddedQuantityResponse(quantity=None)
    changes = session.scalar(
        select(func.coalesce(func.sum(StockMovement.quantityChange), 0)).where(
            StockMovement.stockItemId == stockItem.id, StockMovement.reason != StockMovementReason.moved
        )
    )
    return LastAddedQuantityResponse(quantity=stockItem.quantity - changes)


maximumPhotoBytes = 100 * 1024
acceptedPhotoTypes = {"image/webp", "image/jpeg", "image/png"}


@router.put("/foods/{foodId}/photo", response_model=FoodResponse)
def uploadFoodPhoto(
    file: UploadFile = File(),
    food: Food = Depends(getAccessibleFood),
    session: Session = Depends(getDatabaseSession),
) -> FoodResponse:
    if file.content_type not in acceptedPhotoTypes:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported photo type")
    content = file.file.read(maximumPhotoBytes + 1)
    if len(content) > maximumPhotoBytes:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="The photo is too large")
    food.photo = content
    food.photoContentType = file.content_type
    food.photoUpdatedAt = datetime.now(timezone.utc)
    session.commit()
    return buildFoodResponse(food)


@router.delete("/foods/{foodId}/photo", response_model=FoodResponse)
def deleteFoodPhoto(food: Food = Depends(getAccessibleFood), session: Session = Depends(getDatabaseSession)) -> FoodResponse:
    food.photo = None
    food.photoContentType = None
    food.photoUpdatedAt = None
    session.commit()
    return buildFoodResponse(food)


@router.get("/foods/{foodId}/photo")
def getFoodPhoto(
    foodId: int, version: int, signature: str = Query(max_length=64), session: Session = Depends(getDatabaseSession)
) -> Response:
    food = session.get(Food, foodId)
    if (
        food is None
        or food.photoUpdatedAt is None
        or int(food.photoUpdatedAt.timestamp() * 1000) != version
        or not hmac.compare_digest(signature, foodPhotoSignature(foodId, version))
    ):
        raise notFoundError("Food photo")
    return Response(
        content=food.photo,
        media_type=food.photoContentType,
        headers={"Cache-Control": "private, max-age=31536000, immutable"},
    )
