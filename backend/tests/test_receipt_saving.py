from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import Food, Receipt, StockItem
from tests.helpers import createHousehold, joinHousehold, registerAndAuthorize
from tests.test_foods import createFood


class ReceiptHousehold:
    def __init__(self, client: TestClient) -> None:
        self.client = client
        self.headers = registerAndAuthorize(client, "anna@example.com", "Anna")
        household = createHousehold(client, self.headers)
        self.id = household["id"]
        self.inviteCode = household["inviteCode"]
        locations = client.get(f"/households/{self.id}/storage-locations", headers=self.headers).json()
        self.fridgeId, self.freezerId, self.pantryId = [location["id"] for location in locations]

    def save(self, items: list[dict], headers: dict[str, str] | None = None, **fields):
        body = {"storeName": "Albert", "purchasedOn": "2026-11-10", "totalAmount": 74.70, "items": items, **fields}
        return self.client.post(f"/households/{self.id}/receipts", json=body, headers=headers or self.headers)


def milkItem(**fields) -> dict:
    return {
        "originalText": "MLEKO POLOTUC 1L",
        "name": "Mléko polotučné",
        "category": "dairy",
        "quantity": 1000,
        "unit": "milliliter",
        "price": 24.90,
        **fields,
    }


def test_saveReceiptCreatesFoodsStockAndLinks(client: TestClient, databaseSession: Session) -> None:
    household = ReceiptHousehold(client)
    newMilk = {"name": "Mléko polotučné", "genericName": "Mléko", "category": "dairy", "baseUnit": "milliliter"}
    items = [
        milkItem(newFood=newMilk, addToStock=True, storageLocationId=household.fridgeId, expirationDate="2026-11-20"),
        milkItem(newFood=newMilk, addToStock=True, storageLocationId=household.fridgeId, expirationDate="2026-11-25"),
        milkItem(originalText="TASKA", name="Taška", category="other", quantity=None, unit=None, price=24.90, correctedByUser=True),
    ]

    response = household.save(items, processingMilliseconds=4200)

    assert response.status_code == 201
    body = response.json()
    assert body["storeName"] == "Albert"
    assert body["totalAmount"] == 74.7
    assert body["itemsSumMatchesTotal"] is True
    assert body["itemCount"] == 3
    assert body["uploadedByDisplayName"] == "Anna"
    assert [item["stockItemId"] is not None for item in body["items"]] == [True, True, False]
    assert body["items"][0]["foodId"] == body["items"][1]["foodId"] is not None
    assert body["items"][2]["foodId"] is None
    assert body["items"][2]["correctedByUser"] is True
    assert databaseSession.scalar(select(Food.genericName)) == "Mléko"

    stock = client.get(f"/households/{household.id}/stock-items", headers=household.headers).json()
    assert [(item["food"]["name"], item["quantity"], item["expirationDate"]) for item in stock] == [
        ("Mléko polotučné", 1000, "2026-11-20"),
        ("Mléko polotučné", 1000, "2026-11-25"),
    ]
    receipt = databaseSession.scalar(select(Receipt))
    assert receipt.processingMilliseconds == 4200


def test_newFoodReusesExistingFoodIgnoringCase(client: TestClient, databaseSession: Session) -> None:
    household = ReceiptHousehold(client)
    existing = createFood(client, household.headers, household.id, "mléko polotučné", baseUnit="milliliter").json()

    body = household.save(
        [milkItem(newFood={"name": "mléko Polotučné", "baseUnit": "milliliter"})], totalAmount=24.90
    ).json()

    assert body["items"][0]["foodId"] == existing["id"]
    assert databaseSession.scalar(select(func.count()).select_from(Food)) == 1


def test_existingFoodCanBeUsedAndSumMismatchIsStored(client: TestClient) -> None:
    household = ReceiptHousehold(client)
    rice = createFood(client, household.headers, household.id, "Rýže").json()

    body = household.save(
        [milkItem(name="Rýže", quantity=1000, unit="gram", foodId=rice["id"], addToStock=True, storageLocationId=household.pantryId)],
        totalAmount=100,
    ).json()

    assert body["itemsSumMatchesTotal"] is False
    stock = client.get(f"/households/{household.id}/stock-items", headers=household.headers).json()
    assert stock[0]["food"]["id"] == rice["id"]
    assert stock[0]["storageLocationId"] == household.pantryId


def test_invalidItemsRollBackTheWholeReceipt(client: TestClient, databaseSession: Session) -> None:
    household = ReceiptHousehold(client)
    rice = createFood(client, household.headers, household.id, "Rýže").json()
    validItem = milkItem(newFood={"name": "Mléko", "baseUnit": "milliliter"}, addToStock=True, storageLocationId=household.fridgeId)

    wrongUnit = household.save([validItem, milkItem(foodId=rice["id"], addToStock=True, storageLocationId=household.fridgeId)])
    wrongLocation = household.save([validItem, milkItem(foodId=rice["id"], unit="gram", addToStock=True, storageLocationId=999999)])
    unknownFood = household.save([validItem, milkItem(foodId=999999)])

    assert wrongUnit.status_code == 422
    assert wrongUnit.json()["detail"] == "Item 2: quantity must be in gram"
    assert wrongLocation.json()["detail"] == "Item 2: storage location not found"
    assert unknownFood.json()["detail"] == "Item 2: food not found"
    for table in (Receipt, StockItem):
        assert databaseSession.scalar(select(func.count()).select_from(table)) == 0
    assert databaseSession.scalar(select(func.count()).select_from(Food)) == 1


def test_requestValidation(client: TestClient) -> None:
    household = ReceiptHousehold(client)

    assert household.save([]).status_code == 422
    assert household.save([milkItem(addToStock=True, storageLocationId=household.fridgeId)]).status_code == 422
    assert household.save([milkItem(foodId=1, newFood={"name": "X", "baseUnit": "gram"})]).status_code == 422
    assert household.save([milkItem(addToStock=True, newFood={"name": "X", "baseUnit": "gram"})]).status_code == 422
    assert household.save([milkItem(price=1.234)]).status_code == 422
    assert household.save([milkItem()], purchasedOn=None).status_code == 422


def test_listAndDetailAreSharedWithMembersOnly(client: TestClient) -> None:
    household = ReceiptHousehold(client)
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    joinHousehold(client, petrHeaders, household.inviteCode)
    older = household.save([milkItem()], purchasedOn="2026-11-01", totalAmount=24.90).json()
    newer = household.save([milkItem(), milkItem()], headers=petrHeaders, storeName=None, totalAmount=49.80).json()

    receipts = client.get(f"/households/{household.id}/receipts", headers=household.headers).json()

    assert [(receipt["id"], receipt["itemCount"], receipt["uploadedByDisplayName"]) for receipt in receipts] == [
        (newer["id"], 2, "Petr"),
        (older["id"], 1, "Anna"),
    ]
    assert "items" not in receipts[0]
    assert client.get(f"/receipts/{older['id']}", headers=petrHeaders).json() == older
    assert client.get(f"/receipts/{older['id']}", headers=strangerHeaders).status_code == 404
    assert client.get(f"/households/{household.id}/receipts", headers=strangerHeaders).status_code == 404
    assert household.save([milkItem()], headers=strangerHeaders).status_code == 404
