import unicodedata
from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.receipts.duplicates import findPossibleDuplicate
from application.foods import buildFoodResponse
from application.models import Food, Receipt, ReceiptItem
from application.models.enumerations import FoodCategory, MeasurementUnit
from application.receipts.quantities import (
    QuantitySource,
    findCatalogQuantity,
    findEarlierQuantities,
    normalizeKey,
    quantityFromText,
    typicalPackage,
)
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


def normalizeWhitespace(text: str) -> str:
    return " ".join(text.split())


def formatStoreName(storeName: str | None) -> str | None:
    storeName = normalizeWhitespace(storeName or "")
    return storeName[:1].upper() + storeName[1:] if storeName else None


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
            "originalText": normalizeWhitespace(item.originalText),
            "name": item.name.strip(),
            "genericName": item.genericName.strip() or None,
            "category": item.category,
            "isFood": item.isFood,
            "quantity": Decimal(str(quantity)).quantize(Decimal("0.001")) if quantity is not None else None,
            "unit": unit,
            "quantitySource": QuantitySource.receipt if quantity is not None else None,
            "estimate": (item.estimatedQuantityPerPackage, item.estimatedUnit),
            "price": price,
            "discount": discount,
        }
        for price, discount in zip(prices, discounts)
    ]


def findEarlierItems(session: Session, householdId: int, storeName: str | None) -> dict[str, tuple[str, Food]]:
    rows = session.execute(
        select(ReceiptItem.originalText, ReceiptItem.name, Receipt.storeName, Food)
        .join(Receipt, Receipt.id == ReceiptItem.receiptId)
        .join(Food, Food.id == ReceiptItem.foodId)
        .where(Receipt.householdId == householdId)
        .order_by(Receipt.purchasedOn.desc(), Receipt.id.desc(), ReceiptItem.id.desc())
    ).all()
    earlier: dict[str, tuple[str, Food]] = {}
    sameStoreKeys: set[str] = set()
    normalizedStore = normalizeName(storeName or "")
    for originalText, name, earlierStoreName, food in rows:
        key = normalizeName(normalizeWhitespace(originalText))
        isSameStore = bool(normalizedStore) and normalizeName(earlierStoreName or "") == normalizedStore
        if key not in earlier or (isSameStore and key not in sameStoreKeys):
            earlier[key] = (name, food)
        if isSameStore:
            sameStoreKeys.add(key)
    return earlier


def rememberEarlierCorrections(items: list[dict], earlier: dict[str, tuple[str, Food]]) -> None:
    for item in items:
        remembered = earlier.get(normalizeName(item["originalText"]))
        item["rememberedFromEarlierReceipt"] = remembered is not None
        if remembered is not None:
            name, food = remembered
            item["name"] = name
            item["category"] = FoodCategory(food.category) if food.category else item["category"]
            item["genericName"] = food.genericName or item["genericName"]
            item["isFood"] = True
            item["rememberedFood"] = food


def suggestedFoodFor(item: dict, matchingFoods: dict[str, Food]) -> Food | None:
    return item.get("rememberedFood") or matchingFoods.get(item["name"])


def fillMissingQuantity(
    session: Session,
    item: dict,
    suggestedFood: Food | None,
    storeName: str | None,
    earlierQuantities: dict[str, tuple[Decimal, MeasurementUnit]],
) -> None:
    if item["quantity"] is not None or not item["isFood"]:
        return
    estimatedQuantity, estimatedUnit = item["estimate"]
    estimate = (
        (Decimal(str(estimatedQuantity)).quantize(Decimal("0.001")), estimatedUnit)
        if estimatedQuantity and estimatedQuantity > 0 and estimatedUnit
        else None
    )
    candidates = [
        (QuantitySource.text, lambda: quantityFromText(item["originalText"])),
        (QuantitySource.history, lambda: earlierQuantities.get(normalizeKey(item["originalText"]))),
        (QuantitySource.catalog, lambda: findCatalogQuantity(session, storeName, item["originalText"])),
        (QuantitySource.estimate, lambda: estimate),
        (QuantitySource.typical, lambda: typicalPackage(item["genericName"])),
    ]
    for source, find in candidates:
        found = find()
        if found is None or (suggestedFood is not None and suggestedFood.baseUnit != found[1]):
            continue
        item["quantity"], item["unit"] = found
        item["quantitySource"] = source
        return


def buildScannedItem(item: dict, suggestedFood: Food | None) -> ScannedReceiptItem:
    fields = {key: value for key, value in item.items() if key not in ("rememberedFood", "estimate")}
    return ScannedReceiptItem(**fields, suggestedFood=buildFoodResponse(suggestedFood) if suggestedFood else None)


def buildScanResponse(
    session: Session, householdId: int, result: ReceiptReadingResult, fileHash: str | None = None
) -> ScanReceiptResponse:
    receipt: ExtractedReceipt = result.receipt
    expandedItems = [expanded for item in receipt.items for expanded in expandItem(item)]
    rememberEarlierCorrections(expandedItems, findEarlierItems(session, householdId, receipt.storeName))
    matchingFoods = findMatchingFoods(session, householdId, {item["name"] for item in expandedItems if item["name"]})
    earlierQuantities = findEarlierQuantities(session, householdId, receipt.storeName)
    for item in expandedItems:
        fillMissingQuantity(
            session, item, suggestedFoodFor(item, matchingFoods), receipt.storeName, earlierQuantities
        )
    itemsSum = sum((toMoney(item.price) for item in receipt.items), Decimal("0.00"))
    totalAmount = toMoney(receipt.totalAmount) if receipt.totalAmount is not None else None
    storeName = formatStoreName(receipt.storeName)
    purchasedOn = parsePurchaseDate(receipt.purchasedOn)
    receiptNumber = (receipt.receiptNumber or "").strip()[:50] or None
    return ScanReceiptResponse(
        storeName=storeName,
        purchasedOn=purchasedOn,
        receiptNumber=receiptNumber,
        fileHash=fileHash,
        possibleDuplicate=findPossibleDuplicate(
            session, householdId, receiptNumber, storeName, purchasedOn, totalAmount
        ),
        totalAmount=totalAmount,
        itemsSum=itemsSum,
        itemsSumMatchesTotal=totalAmount is not None and abs(itemsSum - totalAmount) <= sumTolerance,
        processingMilliseconds=result.processingMilliseconds,
        items=[buildScannedItem(item, suggestedFoodFor(item, matchingFoods)) for item in expandedItems],
    )
