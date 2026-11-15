import logging
from decimal import ROUND_HALF_UP, Decimal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership
from application.foods import buildFoodResponse
from application.models import HouseholdMember, RecipeScan, User
from application.receipts.scanning import findMatchingFoods, normalizeWhitespace
from application.recipes.dependencies import getRecipeReader
from application.recipes.reading import ExtractedRecipe, RecipeReader, RecipeReadingError
from application.schemas.recipes import RecipeScanAllowanceResponse, ScannedIngredient, ScanRecipeResponse

router = APIRouter(tags=["recipe scans"])
logger = logging.getLogger(__name__)
maximumPhotoCount = 3
maximumFileBytes = 10 * 1024 * 1024
acceptedFileTypes = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif", "application/pdf"}
defaultServings = 4
quantityPrecision = Decimal("0.001")


def usedScans(session: Session, householdId: int) -> int:
    return session.scalar(select(func.count()).select_from(RecipeScan).where(RecipeScan.householdId == householdId))


def capitalize(text: str) -> str:
    text = normalizeWhitespace(text)
    return text[:1].upper() + text[1:]


def buildScanResponse(session: Session, householdId: int, recipe: ExtractedRecipe, used: int) -> ScanRecipeResponse:
    names = {capitalize(ingredient.name) for ingredient in recipe.ingredients if ingredient.name.strip()}
    matchingFoods = findMatchingFoods(session, householdId, names)
    ingredients = []
    for ingredient in recipe.ingredients:
        name = capitalize(ingredient.name)
        if not name:
            continue
        quantity = (
            Decimal(str(ingredient.quantity)).quantize(quantityPrecision, rounding=ROUND_HALF_UP)
            if ingredient.quantity is not None and ingredient.quantity > 0 and ingredient.unit is not None
            else None
        )
        unit = ingredient.unit if quantity is not None else None
        suggestedFood = matchingFoods.get(name)
        if suggestedFood is not None and unit is not None and suggestedFood.baseUnit != unit:
            suggestedFood = None
        ingredients.append(
            ScannedIngredient(
                originalText=normalizeWhitespace(ingredient.originalText),
                name=name,
                genericName=capitalize(ingredient.genericName) or None,
                category=ingredient.category,
                quantity=quantity,
                unit=unit,
                isOptional=ingredient.isOptional,
                suggestedFood=buildFoodResponse(suggestedFood) if suggestedFood else None,
            )
        )
    steps = [normalizeWhitespace(step) for step in recipe.steps if step.strip()]
    return ScanRecipeResponse(
        name=capitalize(recipe.name)[:100] or "Recept z fotky",
        servings=recipe.servings if recipe.servings and 1 <= recipe.servings <= 100 else defaultServings,
        preparationMinutes=(
            recipe.preparationMinutes if recipe.preparationMinutes and 1 <= recipe.preparationMinutes <= 2880 else None
        ),
        dishType=recipe.dishType,
        isVegetarian=recipe.isVegetarian,
        instructions="\n".join(f"{index}. {step}" for index, step in enumerate(steps, start=1))[:20000],
        ingredients=ingredients,
        usedScans=used,
        scanLimit=getConfiguration().recipeScanLimit,
    )


@router.get("/households/{householdId}/recipes/scan-allowance", response_model=RecipeScanAllowanceResponse)
def getScanAllowance(
    membership: HouseholdMember = Depends(getHouseholdMembership), session: Session = Depends(getDatabaseSession)
) -> RecipeScanAllowanceResponse:
    return RecipeScanAllowanceResponse(
        usedScans=usedScans(session, membership.householdId), scanLimit=getConfiguration().recipeScanLimit
    )


@router.post("/households/{householdId}/recipes/scan", response_model=ScanRecipeResponse)
def scanRecipe(
    files: list[UploadFile] = File(),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
    recipeReader: RecipeReader = Depends(getRecipeReader),
) -> ScanRecipeResponse:
    if user.recipePhotoConsentGivenAt is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recipe photo consent has not been given")
    if not 1 <= len(files) <= maximumPhotoCount:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Send one to three photos")
    if usedScans(session, membership.householdId) >= getConfiguration().recipeScanLimit:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="The recipe scan limit is used up")
    contents = []
    for file in files:
        if file.content_type not in acceptedFileTypes:
            raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported file type")
        fileBytes = file.file.read(maximumFileBytes + 1)
        if len(fileBytes) > maximumFileBytes:
            raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="A file is too large")
        contents.append((fileBytes, file.content_type))
    try:
        result = recipeReader.readRecipe(contents)
    except RecipeReadingError as error:
        logger.warning("Recipe reading failed: %s", error)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The recipe could not be read")
    finally:
        del contents
    logger.info(
        "Recipe read in %d ms, %s input and %s output tokens",
        result.processingMilliseconds,
        result.inputTokens,
        result.outputTokens,
    )
    if not result.recipe.isRecipe or not result.recipe.ingredients:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="No recipe was found")
    session.add(
        RecipeScan(
            householdId=membership.householdId,
            userId=user.id,
            photoCount=len(files),
            processingMilliseconds=result.processingMilliseconds,
            inputTokens=result.inputTokens,
            outputTokens=result.outputTokens,
        )
    )
    session.commit()
    used = usedScans(session, membership.householdId)
    return buildScanResponse(session, membership.householdId, result.recipe, used)
