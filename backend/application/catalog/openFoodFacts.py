import csv
import gzip
import io
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, field
from decimal import Decimal

from application.models.enumerations import FoodCategory, MeasurementUnit
from application.receipts.quantities import normalizeKey, quantityFromText

czechCountryTag = "en:czech-republic"
categoryRules: list[tuple[tuple[str, ...], FoodCategory]] = [
    (("en:frozen-foods",), FoodCategory.frozen),
    (("en:canned-foods",), FoodCategory.canned),
    (("en:fishes", "en:seafood", "en:fish-and-seafood"), FoodCategory.fish),
    (
        ("en:meats", "en:meats-and-their-products", "en:sausages", "en:hams", "en:poultries", "en:prepared-meats", "cs:maso", "cs:šunka"),
        FoodCategory.meatAndSausages,
    ),
    (("en:dairies", "en:cheeses", "en:milks", "en:yogurts", "en:butters", "en:creams", "en:eggs"), FoodCategory.dairy),
    (("en:breads", "en:pastries", "en:viennoiseries"), FoodCategory.bakery),
    (("en:chocolates", "en:confectioneries", "en:candies", "en:biscuits-and-cakes", "en:sweet-snacks", "en:desserts", "en:puddings"), FoodCategory.sweets),
    (
        ("en:beverages", "en:beverages-and-beverages-preparations", "en:waters", "en:juices", "en:sodas", "en:coffees", "en:teas", "en:syrups"),
        FoodCategory.beverages,
    ),
    (("en:condiments", "en:spices", "en:sauces", "en:salts", "en:herbs"), FoodCategory.spices),
    (("en:fruits", "en:fruits-based-foods"), FoodCategory.fruit),
    (("en:vegetables", "en:vegetables-based-foods", "en:potatoes"), FoodCategory.vegetables),
    (
        ("en:cereals-and-potatoes", "en:pastas", "en:rices", "en:flours", "en:legumes", "en:breakfast-cereals", "en:sugars", "en:nuts"),
        FoodCategory.dryGoods,
    ),
]


@dataclass(frozen=True)
class ImportedProduct:
    barcode: str
    name: str
    brand: str | None
    quantityText: str | None
    quantity: Decimal | None
    unit: MeasurementUnit | None
    category: FoodCategory
    popularity: int
    nutrition: dict[str, Decimal | None] = field(default_factory=dict)
    nutriscoreGrade: str | None = None


def categoryFromTags(tags: str) -> FoodCategory:
    tagSet = set(tags.lower().split(","))
    for ruleTags, category in categoryRules:
        if tagSet.intersection(ruleTags):
            return category
    return FoodCategory.other


nutritionColumns = {
    "energyKcal": "energy-kcal_100g",
    "fat": "fat_100g",
    "saturatedFat": "saturated-fat_100g",
    "carbohydrates": "carbohydrates_100g",
    "sugars": "sugars_100g",
    "proteins": "proteins_100g",
    "fiber": "fiber_100g",
    "salt": "salt_100g",
}


def nutritionValue(text: str | None) -> Decimal | None:
    try:
        value = Decimal((text or "").strip())
    except ArithmeticError:
        return None
    if not value.is_finite() or value < 0 or value > 1000:
        return None
    return value.quantize(Decimal("0.01"))


def nutritionFromRow(row: dict[str, str]) -> dict[str, Decimal | None]:
    return {name: nutritionValue(row.get(column)) for name, column in nutritionColumns.items()}


def nutriscoreGradeOf(text: str | None) -> str | None:
    grade = (text or "").strip().lower()
    return grade if grade in ("a", "b", "c", "d", "e") else None


def cleanText(text: str, maximumLength: int) -> str | None:
    text = " ".join(text.split())
    return text[:maximumLength] or None


def productFromRow(row: dict[str, str]) -> ImportedProduct | None:
    if czechCountryTag not in (row.get("countries_tags") or "").split(","):
        return None
    barcode = (row.get("code") or "").strip()
    name = cleanText(row.get("product_name") or "", 150)
    if not barcode.isdigit() or not name:
        return None
    quantityText = cleanText(row.get("quantity") or "", 50)
    parsed = quantityFromText(quantityText) if quantityText else None
    brand = cleanText((row.get("brands") or "").split(",")[0], 80)
    try:
        popularity = int(float(row.get("unique_scans_n") or 0))
    except ValueError:
        popularity = 0
    return ImportedProduct(
        barcode=barcode,
        name=name[:1].upper() + name[1:],
        brand=brand,
        quantityText=quantityText,
        quantity=parsed[0] if parsed else None,
        unit=parsed[1] if parsed else None,
        category=categoryFromTags(row.get("categories_tags") or ""),
        popularity=popularity,
        nutrition=nutritionFromRow(row),
        nutriscoreGrade=nutriscoreGradeOf(row.get("nutriscore_grade")),
    )


def readProducts(lines: Iterable[str]) -> Iterator[ImportedProduct]:
    csv.field_size_limit(10**8)
    seen: set[str] = set()
    for row in csv.DictReader(lines, delimiter="\t", quoting=csv.QUOTE_NONE):
        product = productFromRow(row)
        if product is not None and product.barcode not in seen:
            seen.add(product.barcode)
            yield product


def openDump(stream) -> io.TextIOWrapper:
    return io.TextIOWrapper(gzip.GzipFile(fileobj=stream), encoding="utf-8", errors="replace", newline="")


def productKey(product: ImportedProduct) -> str:
    return normalizeKey(" ".join(filter(None, [product.name, product.brand])))
