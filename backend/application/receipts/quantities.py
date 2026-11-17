import re
import unicodedata
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from application.models import Receipt, ReceiptItem
from application.models.enumerations import MeasurementUnit
from application.models.receipt import ProductQuantity


class QuantitySource:
    receipt = "receipt"
    text = "text"
    history = "history"
    catalog = "catalog"
    estimate = "estimate"
    typical = "typical"


unitFactors = {
    "kg": (Decimal("1000"), MeasurementUnit.gram),
    "g": (Decimal("1"), MeasurementUnit.gram),
    "gr": (Decimal("1"), MeasurementUnit.gram),
    "l": (Decimal("1000"), MeasurementUnit.milliliter),
    "dl": (Decimal("100"), MeasurementUnit.milliliter),
    "cl": (Decimal("10"), MeasurementUnit.milliliter),
    "ml": (Decimal("1"), MeasurementUnit.milliliter),
    "ks": (Decimal("1"), MeasurementUnit.piece),
}
quantityPattern = re.compile(r"(?<![\d.,])(\d+(?:[.,]\d+)?)\s*(kg|gr|g|dl|cl|ml|l|ks)(?![a-z])")
typicalPackages: dict[str, tuple[Decimal, MeasurementUnit]] = {
    "mleko": (Decimal("1000"), MeasurementUnit.milliliter),
    "maslo": (Decimal("250"), MeasurementUnit.gram),
    "smetana": (Decimal("250"), MeasurementUnit.milliliter),
    "jogurt": (Decimal("150"), MeasurementUnit.gram),
    "tvaroh": (Decimal("250"), MeasurementUnit.gram),
    "syr": (Decimal("100"), MeasurementUnit.gram),
    "sunka": (Decimal("100"), MeasurementUnit.gram),
    "mouka": (Decimal("1000"), MeasurementUnit.gram),
    "cukr": (Decimal("1000"), MeasurementUnit.gram),
    "ryze": (Decimal("1000"), MeasurementUnit.gram),
    "testoviny": (Decimal("500"), MeasurementUnit.gram),
    "olej": (Decimal("1000"), MeasurementUnit.milliliter),
    "vejce": (Decimal("10"), MeasurementUnit.piece),
    "rohlik": (Decimal("1"), MeasurementUnit.piece),
    "pecivo": (Decimal("1"), MeasurementUnit.piece),
    "chleb": (Decimal("1000"), MeasurementUnit.gram),
    "voda": (Decimal("1500"), MeasurementUnit.milliliter),
    "pivo": (Decimal("500"), MeasurementUnit.milliliter),
    "kava": (Decimal("250"), MeasurementUnit.gram),
}


def normalizeKey(text: str | None) -> str:
    decomposed = unicodedata.normalize("NFKD", " ".join((text or "").split()).lower())
    return "".join(character for character in decomposed if not unicodedata.combining(character))


def quantityFromText(text: str) -> tuple[Decimal, MeasurementUnit] | None:
    matches = quantityPattern.findall(normalizeKey(text))
    if not matches:
        return None
    number, unitText = matches[-1]
    factor, unit = unitFactors[unitText]
    quantity = Decimal(number.replace(",", ".")) * factor
    return (quantity.quantize(Decimal("0.001")), unit) if quantity > 0 else None


def typicalPackage(genericName: str | None) -> tuple[Decimal, MeasurementUnit] | None:
    return typicalPackages.get(normalizeKey(genericName))


def findEarlierQuantities(
    session: Session, householdId: int, storeName: str | None
) -> dict[str, tuple[Decimal, MeasurementUnit]]:
    rows = session.execute(
        select(ReceiptItem.originalText, ReceiptItem.quantity, ReceiptItem.unit, Receipt.storeName)
        .join(Receipt, Receipt.id == ReceiptItem.receiptId)
        .where(
            Receipt.householdId == householdId,
            ReceiptItem.quantity.is_not(None),
            ReceiptItem.unit.is_not(None),
            ReceiptItem.quantityIsEstimate.is_(False),
        )
        .order_by(Receipt.purchasedOn.desc(), Receipt.id.desc(), ReceiptItem.id.desc())
    ).all()
    earlier: dict[str, tuple[Decimal, MeasurementUnit]] = {}
    sameStoreKeys: set[str] = set()
    normalizedStore = normalizeKey(storeName)
    for originalText, quantity, unit, earlierStoreName in rows:
        key = normalizeKey(originalText)
        isSameStore = bool(normalizedStore) and normalizeKey(earlierStoreName) == normalizedStore
        if key not in earlier or (isSameStore and key not in sameStoreKeys):
            earlier[key] = (quantity, unit)
        if isSameStore:
            sameStoreKeys.add(key)
    return earlier


def findCatalogQuantity(
    session: Session, storeName: str | None, originalText: str
) -> tuple[Decimal, MeasurementUnit] | None:
    storeKey = normalizeKey(storeName)
    rows = session.execute(
        select(ProductQuantity.storeKey, ProductQuantity.quantity, ProductQuantity.unit)
        .where(ProductQuantity.textKey == normalizeKey(originalText))
        .order_by(ProductQuantity.confirmationCount.desc(), ProductQuantity.updatedAt.desc())
    ).all()
    sameStore = [row for row in rows if row.storeKey == storeKey]
    best = (sameStore or rows or [None])[0]
    return (best.quantity, best.unit) if best else None


def rememberConfirmedQuantity(
    session: Session, storeName: str | None, originalText: str, quantity: Decimal, unit: MeasurementUnit
) -> None:
    values = {
        "storeKey": normalizeKey(storeName),
        "textKey": normalizeKey(originalText),
        "quantity": quantity,
        "unit": unit,
    }
    statement = insert(ProductQuantity).values(**values, confirmationCount=1)
    session.execute(
        statement.on_conflict_do_update(
            constraint="uq_product_quantities_store_key_text_key_quantity_unit",
            set_={"confirmation_count": ProductQuantity.confirmationCount + 1, "updated_at": statement.excluded.updated_at},
        )
    )

