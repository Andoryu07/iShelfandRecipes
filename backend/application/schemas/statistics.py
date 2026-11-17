from pydantic import BaseModel

from application.models.enumerations import FoodCategory, UnhealthyKind
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


class UnhealthyKindSpending(BaseModel):
    kind: UnhealthyKind
    total: QuantityValue


class UnhealthyMonthSpending(BaseModel):
    month: str
    total: QuantityValue


class UnhealthySpendingResponse(BaseModel):
    month: str
    total: QuantityValue
    monthTotal: QuantityValue
    previousMonthTotal: QuantityValue
    kinds: list[UnhealthyKindSpending]
    months: list[UnhealthyMonthSpending]
