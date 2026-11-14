from pydantic import BaseModel

from application.models.enumerations import FoodCategory
from application.schemas.common import QuantityValue


class MonthSpending(BaseModel):
    month: str
    total: QuantityValue
    receiptCount: int


class StoreSpending(BaseModel):
    storeName: str | None
    total: QuantityValue
    receiptCount: int


class CategorySpending(BaseModel):
    category: FoodCategory
    total: QuantityValue


class SpendingResponse(BaseModel):
    month: str
    monthTotal: QuantityValue
    previousMonthTotal: QuantityValue
    receiptCount: int
    discountsTotal: QuantityValue
    months: list[MonthSpending]
    stores: list[StoreSpending]
    categories: list[CategorySpending]
