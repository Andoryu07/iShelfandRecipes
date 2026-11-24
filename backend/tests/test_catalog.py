import gzip
import io
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from application.catalog.import_open_food_facts import importProducts
from application.catalog.openFoodFacts import openDump, readProducts
from application.models.enumerations import FoodCategory, MeasurementUnit
from tests.helpers import registerAndAuthorize

columns = ["code", "product_name", "brands", "quantity", "categories_tags", "countries_tags", "unique_scans_n", "energy-kcal_100g", "proteins_100g", "salt_100g", "nutriscore_grade"]
rows = [
    ["8594003849385", "mléko polotučné trvanlivé", "Madeta,Jihočeské", "1 l", "en:dairies,en:milks", "en:czech-republic", "40", "47", "3.4", "0.13", "b"],
    ["8590000000002", "Jogurt bílý", "Olma", "150 g", "en:dairies,en:yogurts", "en:czech-republic,en:slovakia", "90", "", "", "", "unknown"],
    ["8590000000003", "Hořká čokoláda 70 %", "Orion", "100g", "en:sweet-snacks,en:chocolates", "en:czech-republic", "", "", "", "", "unknown"],
    ["8590000000004", "Rohlíky", "", "", "en:breads", "en:czech-republic", "3", "", "", "", "unknown"],
    ["4000000000005", "Milch", "Weihenstephan", "1 l", "en:dairies", "en:germany", "500", "", "", "", "unknown"],
    ["8590000000006", "", "Bez názvu", "1 kg", "", "en:czech-republic", "1", "", "", "", "unknown"],
    ["8594003849385", "Duplicitní mléko", "Madeta", "1 l", "en:dairies", "en:czech-republic", "1", "", "", "", "unknown"],
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


def test_barcodeFindsTheHouseholdFoodAndTheCatalogProduct(client: TestClient, databaseSession: Session) -> None:
    importProducts(databaseSession, readProducts(openDump(dump())))
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = client.post("/households", json={"name": "Doma"}, headers=headers).json()["id"]
    url = f"/households/{householdId}/barcodes/8590000000002"

    first = client.get(url, headers=headers).json()
    assert (first["food"], first["catalogProduct"]["name"]) == (None, "Jogurt bílý")

    created = client.post(
        f"/households/{householdId}/foods",
        json={"name": "Jogurt bílý Olma", "baseUnit": "gram", "barcode": "8590000000002"},
        headers=headers,
    ).json()
    assert created["barcode"] == "8590000000002"
    assert client.get(url, headers=headers).json()["food"]["id"] == created["id"]

    other = client.post(f"/households/{householdId}/foods", json={"name": "Jogurt", "baseUnit": "gram"}, headers=headers).json()
    moved = client.patch(f"/foods/{other['id']}", json={"barcode": "8590000000002"}, headers=headers).json()
    assert moved["barcode"] == "8590000000002"
    assert client.get(url, headers=headers).json()["food"]["id"] == other["id"]

    unknown = client.get(f"/households/{householdId}/barcodes/12345678", headers=headers).json()
    assert (unknown["food"], unknown["catalogProduct"]) == (None, None)
    assert client.get(f"/households/{householdId}/barcodes/abc", headers=headers).status_code == 422
    stranger = registerAndAuthorize(client, "petr@example.com", "Petr")
    assert client.get(url, headers=stranger).status_code == 404


def test_nutritionIsImportedAndCanBeSavedOnFoods(client: TestClient, databaseSession: Session) -> None:
    importProducts(databaseSession, readProducts(openDump(dump())))
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = client.post("/households", json={"name": "Doma"}, headers=headers).json()["id"]

    milk = client.get("/catalog/products/8594003849385", headers=headers).json()
    assert milk["nutrition"]["energyKcal"] == 47
    assert milk["nutrition"]["proteins"] == 3.4
    assert milk["nutrition"]["fat"] is None
    assert milk["nutriscoreGrade"] == "b"
    assert client.get("/catalog/products/8590000000002", headers=headers).json()["nutrition"] is None

    created = client.post(
        f"/households/{householdId}/foods",
        json={"name": "Rohlík", "baseUnit": "piece", "nutrition": {"energyKcal": 290, "proteins": 9}, "pieceWeightGrams": 43},
        headers=headers,
    ).json()
    assert (created["nutrition"]["energyKcal"], created["pieceWeightGrams"]) == (290, 43)
    cleared = client.patch(f"/foods/{created['id']}", json={"nutrition": None}, headers=headers).json()
    assert (cleared["nutrition"], cleared["pieceWeightGrams"]) == (None, 43)
    invalid = client.patch(f"/foods/{created['id']}", json={"nutrition": {"energyKcal": -5}}, headers=headers)
    assert invalid.status_code == 422


@pytest.mark.predefinedRecipes
def test_predefinedFoodsHaveTypicalNutrition(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = client.post("/households", json={"name": "Doma"}, headers=headers).json()["id"]

    foods = {food["name"]: food for food in client.get(f"/households/{householdId}/foods", headers=headers).json()}

    assert foods["Eidam"]["nutrition"]["energyKcal"] == 350
    assert (foods["Vejce"]["nutrition"]["proteins"], foods["Vejce"]["pieceWeightGrams"]) == (12.5, 50)
    assert all(food["nutrition"] is not None for food in foods.values())


def test_importFillsMissingNutritionOfFoodsWithTheSameBarcode(client: TestClient, databaseSession: Session) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = client.post("/households", json={"name": "Doma"}, headers=headers).json()["id"]
    foodsUrl = f"/households/{householdId}/foods"
    milk = client.post(foodsUrl, json={"name": "Mléko Madeta", "baseUnit": "milliliter", "barcode": "8594003849385"}, headers=headers).json()
    own = client.post(
        foodsUrl,
        json={"name": "Moje mléko", "baseUnit": "milliliter", "barcode": "8590000000004", "nutrition": {"energyKcal": 60}},
        headers=headers,
    ).json()
    yogurt = client.post(foodsUrl, json={"name": "Jogurt", "baseUnit": "gram", "barcode": "8590000000002"}, headers=headers).json()

    importProducts(databaseSession, readProducts(openDump(dump())))
    databaseSession.expire_all()

    foods = {food["id"]: food for food in client.get(foodsUrl, headers=headers).json()}
    assert foods[milk["id"]]["nutrition"]["energyKcal"] == 47
    assert foods[milk["id"]]["nutriscoreGrade"] == "b"
    assert foods[own["id"]]["nutrition"]["energyKcal"] == 60
    assert foods[yogurt["id"]]["nutrition"] is None
