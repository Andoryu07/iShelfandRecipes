from pydantic import BaseModel

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.common import QuantityValue
from application.schemas.foods import FoodResponse
from application.schemas.nutrition import Nutrition


class CatalogProductResponse(BaseModel):
    barcode: str
    name: str
    brand: str | None
    quantityText: str | None
    quantity: QuantityValue | None
    unit: MeasurementUnit | None
    category: FoodCategory
    nutrition: Nutrition | None = None
    nutriscoreGrade: str | None = None


class BarcodeLookupResponse(BaseModel):
    barcode: str
    food: FoodResponse | None
    catalogProduct: CatalogProductResponse | None
