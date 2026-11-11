from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.models import StorageLocation, StockItem
from tests.helpers import createHousehold, registerAndAuthorize


def createFood(client: TestClient, headers: dict[str, str], householdId: int, name: str, **fields):
    body = {"name": name, "baseUnit": "gram", **fields}
    return client.post(f"/households/{householdId}/foods", json=body, headers=headers)


def test_createAndListFoodsSortedByName(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]

    created = createFood(client, headers, householdId, " Mléko ", baseUnit="milliliter", category="dairy")
    createFood(client, headers, householdId, "chléb", category="bakery", baseUnit="piece")
    createFood(client, headers, householdId, "Banány")

    assert created.status_code == 201
    assert created.json() == {"id": created.json()["id"], "name": "Mléko", "category": "dairy", "baseUnit": "milliliter"}
    names = [food["name"] for food in client.get(f"/households/{householdId}/foods", headers=headers).json()]
    assert names == ["Banány", "chléb", "Mléko"]


def test_categoryDefaultsToOtherAndMustBeKnown(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]

    assert createFood(client, headers, householdId, "Something").json()["category"] == "other"
    assert createFood(client, headers, householdId, "Thing", category="toys").status_code == 422
    assert createFood(client, headers, householdId, "Thing", baseUnit="kilogram").status_code == 422


def test_searchIgnoresCaseAndAccents(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    for name in ["Mléko polotučné", "Máslo", "Kakao 100%"]:
        createFood(client, headers, householdId, name)

    def search(text: str) -> list[str]:
        response = client.get(f"/households/{householdId}/foods", params={"search": text}, headers=headers)
        return [food["name"] for food in response.json()]

    assert search("MLEKO") == ["Mléko polotučné"]
    assert search("ásl") == ["Máslo"]
    assert search("100%") == ["Kakao 100%"]
    assert search("%") == ["Kakao 100%"]


def test_foodNamesAreUniqueIgnoringCaseWithinHousehold(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    annaHouseholdId = createHousehold(client, annaHeaders)["id"]
    petrHouseholdId = createHousehold(client, petrHeaders)["id"]
    createFood(client, annaHeaders, annaHouseholdId, "Mléko")
    other = createFood(client, annaHeaders, annaHouseholdId, "Máslo").json()

    assert createFood(client, annaHeaders, annaHouseholdId, "mléko").status_code == 409
    assert client.patch(f"/foods/{other['id']}", json={"name": "MLÉKO"}, headers=annaHeaders).status_code == 409
    assert createFood(client, petrHeaders, petrHouseholdId, "Mléko").status_code == 201


def test_updateFoodAndBlockUnitChangeWhenInStock(client: TestClient, databaseSession: Session) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    food = createFood(client, headers, householdId, "Rýže").json()

    updated = client.patch(
        f"/foods/{food['id']}", json={"name": "Rýže basmati", "category": "dryGoods", "baseUnit": "piece"}, headers=headers
    )
    assert updated.json() == {"id": food["id"], "name": "Rýže basmati", "category": "dryGoods", "baseUnit": "piece"}

    storageLocationId = databaseSession.scalar(
        select(StorageLocation.id).where(StorageLocation.householdId == householdId)
    )
    databaseSession.add(StockItem(storageLocationId=storageLocationId, foodId=food["id"], quantity=Decimal(2)))
    databaseSession.commit()

    assert client.patch(f"/foods/{food['id']}", json={"baseUnit": "gram"}, headers=headers).status_code == 409
    assert client.patch(f"/foods/{food['id']}", json={"baseUnit": "piece", "name": "Rýže"}, headers=headers).status_code == 200


def test_strangerCannotSeeOrChangeFoods(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    householdId = createHousehold(client, annaHeaders)["id"]
    food = createFood(client, annaHeaders, householdId, "Mléko").json()

    assert client.get(f"/households/{householdId}/foods", headers=strangerHeaders).status_code == 404
    assert createFood(client, strangerHeaders, householdId, "Sýr").status_code == 404
    assert client.patch(f"/foods/{food['id']}", json={"name": "Mine"}, headers=strangerHeaders).status_code == 404
