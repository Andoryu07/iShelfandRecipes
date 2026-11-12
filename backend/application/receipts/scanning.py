import unicodedata
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.foods import buildFoodResponse
from application.models import Food
from application.receipts.reading import ExtractedReceipt, ExtractedReceiptItem, ReceiptReadingResult
from application.schemas.receipts import ScannedReceiptItem, ScanReceiptResponse

maximumPackageCount = 20
sumTolerance = Decimal("1.00")
oneHaler = Decimal("0.01")


def toMoney(value: float) -> Decimal:
    return Decimal(str(value)).quantize(oneHaler, rounding=ROUND_HALF_UP)


def splitAmount(total: Decimal, partCount: int) -> list[Decimal]:
    part = (total / partCount).quantize(oneHaler, rounding=ROUND_HALF_UP)
    return [part] * (partCount - 1) + [total - part * (partCount - 1)]


def parsePurchaseDate(text: str | None) -> date | None:
    try:
        return date.fromisoformat(text) if text else None
    except ValueError:
        return None


def normalizeName(name: str) -> str:
    decomposed = unicodedata.normalize("NFKD", name.strip().lower())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


def findMatchingFoods(session: Session, householdId: int, names: set[str]) -> dict[str, Food]:
    foodsByNormalizedName = {
        normalizeName(food.name): food for food in session.scalars(select(Food).where(Food.householdId == householdId))
    }
    return {
        name: foodsByNormalizedName[normalizeName(name)]
        for name in names
        if normalizeName(name) in foodsByNormalizedName
    }


def expandItem(item: ExtractedReceiptItem) -> list[dict]:
    packageCount = min(max(item.packageCount, 1), maximumPackageCount)
    quantity = item.quantityPerPackage if item.quantityPerPackage and item.quantityPerPackage > 0 else None
    unit = item.unit if quantity is not None else None
    if quantity is None or unit is None:
        quantity, unit = None, None
    prices = splitAmount(toMoney(item.price), packageCount)
    discounts = splitAmount(toMoney(abs(item.discount)), packageCount)
    return [
        {
            "originalText": item.originalText,
            "name": item.name.strip(),
            "category": item.category,
            "isFood": item.isFood,
            "quantity": Decimal(str(quantity)).quantize(Decimal("0.001")) if quantity is not None else None,
            "unit": unit,
            "price": price,
            "discount": discount,
        }
        for price, discount in zip(prices, discounts)
    ]


def buildScanResponse(session: Session, householdId: int, result: ReceiptReadingResult) -> ScanReceiptResponse:
    receipt: ExtractedReceipt = result.receipt
    expandedItems = [expanded for item in receipt.items for expanded in expandItem(item)]
    matchingFoods = findMatchingFoods(session, householdId, {item["name"] for item in expandedItems if item["name"]})
    itemsSum = sum((toMoney(item.price) for item in receipt.items), Decimal("0.00"))
    totalAmount = toMoney(receipt.totalAmount) if receipt.totalAmount is not None else None
    return ScanReceiptResponse(
        storeName=receipt.storeName.strip() if receipt.storeName else None,
        purchasedOn=parsePurchaseDate(receipt.purchasedOn),
        totalAmount=totalAmount,
        itemsSum=itemsSum,
        itemsSumMatchesTotal=totalAmount is not None and abs(itemsSum - totalAmount) <= sumTolerance,
        processingMilliseconds=result.processingMilliseconds,
        items=[
            ScannedReceiptItem(
                **item,
                suggestedFood=buildFoodResponse(matchingFoods[item["name"]]) if item["name"] in matchingFoods else None,
            )
            for item in expandedItems
        ],
    )
