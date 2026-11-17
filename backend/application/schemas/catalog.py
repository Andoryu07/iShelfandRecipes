from pydantic import BaseModel

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.common import QuantityValue


class CatalogProductResponse(BaseModel):
    barcode: str
    name: str
    brand: str | None
    quantityText: str | None
    quantity: QuantityValue | None
    unit: MeasurementUnit | None
    category: FoodCategory
