from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, notFoundError
from application.foods import escapeLikePattern
from application.models import CatalogProduct, User
from application.receipts.quantities import normalizeKey
from application.schemas.catalog import CatalogProductResponse

router = APIRouter(prefix="/catalog", tags=["catalog"])


def buildCatalogProductResponse(product: CatalogProduct) -> CatalogProductResponse:
    return CatalogProductResponse(
        barcode=product.barcode,
        name=product.name,
        brand=product.brand,
        quantityText=product.quantityText,
        quantity=product.quantity,
        unit=product.unit,
        category=product.category,
    )


@router.get("/products", response_model=list[CatalogProductResponse])
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


@router.get("/products/{barcode}", response_model=CatalogProductResponse)
def getCatalogProduct(
    barcode: str, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> CatalogProductResponse:
    product = session.scalar(select(CatalogProduct).where(CatalogProduct.barcode == barcode))
    if product is None:
        raise notFoundError("Product")
    return buildCatalogProductResponse(product)
