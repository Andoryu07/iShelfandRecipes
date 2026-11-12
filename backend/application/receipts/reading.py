from dataclasses import dataclass
from typing import Protocol

from pydantic import BaseModel, Field

from application.models.enumerations import FoodCategory, MeasurementUnit


class ExtractedReceiptItem(BaseModel):
    originalText: str = Field(
        description="Only the product name exactly as printed, for example 'OLIVOVÝ ŠTANGL'. Without price, "
        "VAT letter, quantity lines like '2 x 11.90', discount lines or repeated names in brackets."
    )
    name: str = Field(
        description="A short Czech name of the product without the brand, as specific as the receipt allows, "
        "for example 'Mléko polotučné', 'Mouka hladká', 'Sýr Gran Moravia'."
    )
    genericName: str = Field(
        description="The general kind of the product in Czech, for example 'Mléko', 'Mouka', 'Sýr', 'Rohlík'."
    )
    category: FoodCategory
    isFood: bool = Field(
        description="False for things that are not food or drink: bags, deposits, drugstore goods, discounts."
    )
    packageCount: int = Field(
        description="How many separately packed identical products the line contains (bottles, cartons, packs). "
        "Loose goods sold by weight or by piece, like rolls or bananas, count as 1."
    )
    quantityPerPackage: float | None = Field(
        description="Amount in one package converted to the base unit (1 l = 1000 milliliter, 0,5 kg = 500 gram). "
        "For loose goods the whole amount, for example 0,532 kg = 532 gram or 6 rolls = 6 piece. "
        "Null if it cannot be read from the receipt. Never guess."
    )
    unit: MeasurementUnit | None = Field(description="Base unit of quantityPerPackage, null if unknown.")
    price: float = Field(description="Final charged price of the whole line in CZK after its discount.")
    discount: float = Field(description="Discount of the line in CZK as a positive number, 0 if none.")


class ExtractedReceipt(BaseModel):
    storeName: str | None = Field(description="Store chain, for example 'Albert', 'Lidl', 'Tesco'.")
    purchasedOn: str | None = Field(description="Date of purchase as YYYY-MM-DD, null if not printed.")
    totalAmount: float | None = Field(description="Total amount paid in CZK.")
    items: list[ExtractedReceiptItem] = Field(
        description="All purchased lines in printed order. A discount for the whole purchase (loyalty card) "
        "is a separate line with a negative price and isFood false."
    )


@dataclass(frozen=True)
class ReceiptReadingResult:
    receipt: ExtractedReceipt
    processingMilliseconds: int
    inputTokens: int | None = None
    outputTokens: int | None = None


class ReceiptReadingError(Exception):
    pass


class ReceiptReader(Protocol):
    def readReceipt(self, content: bytes, mimeType: str) -> ReceiptReadingResult: ...
