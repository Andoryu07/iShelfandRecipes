from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Self

from pydantic import BaseModel, Field, StringConstraints, model_validator

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.schemas.foods import FoodResponse
from application.schemas.common import FoodName, RequiredName
from application.schemas.common import PositiveQuantity, QuantityValue


class ScannedReceiptItem(BaseModel):
    originalText: str
    name: str
    genericName: str | None
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


Money = Annotated[Decimal, Field(max_digits=12, decimal_places=2)]
NonNegativeMoney = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=2)]


class NewFoodRequest(BaseModel):
    name: FoodName
    genericName: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None
    category: FoodCategory = FoodCategory.other
    baseUnit: MeasurementUnit


class SaveReceiptItemRequest(BaseModel):
    originalText: str = Field(max_length=500)
    name: RequiredName
    category: FoodCategory = FoodCategory.other
    quantity: PositiveQuantity | None = None
    unit: MeasurementUnit | None = None
    price: Money
    discount: NonNegativeMoney = Decimal("0")
    correctedByUser: bool = False
    foodId: int | None = None
    newFood: NewFoodRequest | None = None
    addToStock: bool = False
    storageLocationId: int | None = None
    expirationDate: date | None = None

    @model_validator(mode="after")
    def checkFoodAndStock(self) -> Self:
        if self.foodId is not None and self.newFood is not None:
            raise ValueError("Use either foodId or newFood, not both")
        if self.addToStock:
            if self.foodId is None and self.newFood is None:
                raise ValueError("An item added to stock needs a food")
            if self.quantity is None or self.storageLocationId is None:
                raise ValueError("An item added to stock needs quantity and storageLocationId")
        return self


class SaveReceiptRequest(BaseModel):
    storeName: Annotated[str, StringConstraints(strip_whitespace=True, max_length=100)] | None = None
    purchasedOn: date
    totalAmount: Money
    processingMilliseconds: int | None = Field(default=None, ge=0)
    items: list[SaveReceiptItemRequest] = Field(min_length=1, max_length=300)


class ReceiptItemResponse(BaseModel):
    id: int
    originalText: str
    name: str
    category: FoodCategory
    quantity: QuantityValue | None
    unit: MeasurementUnit | None
    price: QuantityValue
    discount: QuantityValue
    correctedByUser: bool
    foodId: int | None
    stockItemId: int | None


class ReceiptSummaryResponse(BaseModel):
    id: int
    storeName: str | None
    purchasedOn: date
    totalAmount: QuantityValue
    itemsSumMatchesTotal: bool
    itemCount: int
    uploadedByDisplayName: str | None
    createdAt: datetime


class ReceiptResponse(ReceiptSummaryResponse):
    items: list[ReceiptItemResponse]
