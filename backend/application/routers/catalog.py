from fastapi import APIRouter, Depends, Path, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership, notFoundError
from application.foods import buildFoodResponse, escapeLikePattern
from application.models import CatalogProduct, Food, HouseholdMember, User
from application.nutrition import nutritionOf
from application.receipts.quantities import normalizeKey
from application.schemas.catalog import BarcodeLookupResponse, CatalogProductResponse

router = APIRouter(tags=["catalog"])


def buildCatalogProductResponse(product: CatalogProduct) -> CatalogProductResponse:
    return CatalogProductResponse(
        barcode=product.barcode,
        name=product.name,
        brand=product.brand,
        quantityText=product.quantityText,
        quantity=product.quantity,
        unit=product.unit,
        category=product.category,
        nutrition=nutritionOf(product),
        nutriscoreGrade=product.nutriscoreGrade,
    )


@router.get("/catalog/products", response_model=list[CatalogProductResponse])
def searchCatalogProducts(
    search: str = Query(min_length=2, max_length=100),
    limit: int = Query(default=8, ge=1, le=30),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> list[CatalogProductResponse]:
    words = [word for word in normalizeKey(search).split() if word][:6]
    query = select(CatalogProduct)
    for word in words:
        query = query.where(CatalogProduct.nameKey.like(f"%{escapeLikePattern(word)}%", escape="\\"))
    products = session.scalars(
        query.order_by(CatalogProduct.popularity.desc(), CatalogProduct.name).limit(limit)
    )
    return [buildCatalogProductResponse(product) for product in products]


@router.get("/catalog/products/{barcode}", response_model=CatalogProductResponse)
def getCatalogProduct(
    barcode: str, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> CatalogProductResponse:
    product = session.scalar(select(CatalogProduct).where(CatalogProduct.barcode == barcode))
    if product is None:
        raise notFoundError("Product")
    return buildCatalogProductResponse(product)


@router.get("/households/{householdId}/barcodes/{barcode}", response_model=BarcodeLookupResponse)
def lookUpBarcode(
    barcode: str = Path(pattern=r"^\d{6,14}$"),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> BarcodeLookupResponse:
    food = session.scalar(select(Food).where(Food.householdId == membership.householdId, Food.barcode == barcode))
    product = session.scalar(select(CatalogProduct).where(CatalogProduct.barcode == barcode))
    return BarcodeLookupResponse(
        barcode=barcode,
        food=buildFoodResponse(food) if food else None,
        catalogProduct=buildCatalogProductResponse(product) if product else None,
    )
