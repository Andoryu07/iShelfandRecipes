import gzip
import io
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from application.catalog.import_open_food_facts import importProducts
from application.catalog.openFoodFacts import openDump, readProducts
from application.models.enumerations import FoodCategory, MeasurementUnit
from tests.helpers import registerAndAuthorize

columns = ["code", "product_name", "brands", "quantity", "categories_tags", "countries_tags", "unique_scans_n"]
rows = [
    ["8594003849385", "mléko polotučné trvanlivé", "Madeta,Jihočeské", "1 l", "en:dairies,en:milks", "en:czech-republic", "40"],
    ["8590000000002", "Jogurt bílý", "Olma", "150 g", "en:dairies,en:yogurts", "en:czech-republic,en:slovakia", "90"],
    ["8590000000003", "Hořká čokoláda 70 %", "Orion", "100g", "en:sweet-snacks,en:chocolates", "en:czech-republic", ""],
    ["8590000000004", "Rohlíky", "", "", "en:breads", "en:czech-republic", "3"],
    ["4000000000005", "Milch", "Weihenstephan", "1 l", "en:dairies", "en:germany", "500"],
    ["8590000000006", "", "Bez názvu", "1 kg", "", "en:czech-republic", "1"],
    ["8594003849385", "Duplicitní mléko", "Madeta", "1 l", "en:dairies", "en:czech-republic", "1"],
]


def dump() -> io.BytesIO:
    text = "\n".join("\t".join(row) for row in [columns, *rows]) + "\n"
    return io.BytesIO(gzip.compress(text.encode()))


def test_onlyCzechNamedProductsAreReadOnce() -> None:
    products = list(readProducts(openDump(dump())))

    assert [product.barcode for product in products] == ["8594003849385", "8590000000002", "8590000000003", "8590000000004"]
    milk = products[0]
    assert (milk.name, milk.brand, milk.quantity, milk.unit, milk.category) == (
        "Mléko polotučné trvanlivé",
        "Madeta",
        Decimal("1000.000"),
        MeasurementUnit.milliliter,
        FoodCategory.dairy,
    )
    assert products[2].category == FoodCategory.sweets
    assert (products[3].quantity, products[3].category) == (None, FoodCategory.bakery)


def test_catalogCanBeSearchedAndReadByBarcode(client: TestClient, databaseSession: Session) -> None:
    assert importProducts(databaseSession, readProducts(openDump(dump()))) == 4
    assert importProducts(databaseSession, readProducts(openDump(dump()))) == 4
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")

    found = client.get("/catalog/products", params={"search": "mleko madeta"}, headers=headers).json()
    assert [(product["name"], product["quantity"], product["unit"]) for product in found] == [
        ("Mléko polotučné trvanlivé", 1000, "milliliter")
    ]
    dairy = client.get("/catalog/products", params={"search": "o"}, headers=headers)
    assert dairy.status_code == 422
    popular = client.get("/catalog/products", params={"search": "ol"}, headers=headers).json()
    assert [product["name"] for product in popular][0] == "Jogurt bílý"
    byBarcode = client.get("/catalog/products/8590000000002", headers=headers).json()
    assert (byBarcode["brand"], byBarcode["quantityText"]) == ("Olma", "150 g")
    assert client.get("/catalog/products/123", headers=headers).status_code == 404
    assert client.get("/catalog/products", params={"search": "mleko"}).status_code == 401
