from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.foods import FoodResponse
from application.schemas.stock import QuantityValue


class ScannedReceiptItem(BaseModel):
    originalText: str
    name: str
    category: FoodCategory
    isFood: bool
    quantity: QuantityValue | None
    unit: MeasurementUnit | None
    price: QuantityValue
    discount: QuantityValue
    suggestedFood: FoodResponse | None


class ScanReceiptResponse(BaseModel):
    storeName: str | None
    purchasedOn: date | None
    totalAmount: QuantityValue | None
    itemsSum: QuantityValue
    itemsSumMatchesTotal: bool
    processingMilliseconds: int
    items: list[ScannedReceiptItem]
