from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import Food, StockItem
from application.models.enumerations import MeasurementUnit
from tests.helpers import createHousehold, joinHousehold, registerAndAuthorize


def listStorageLocations(client: TestClient, headers: dict[str, str], householdId: int) -> list[dict]:
    return client.get(f"/households/{householdId}/storage-locations", headers=headers).json()


def addStockItem(databaseSession: Session, householdId: int, storageLocationId: int, quantity: int) -> None:
    food = Food(householdId=householdId, name="Butter", baseUnit=MeasurementUnit.gram)
    databaseSession.add(food)
    databaseSession.flush()
    databaseSession.add(StockItem(storageLocationId=storageLocationId, foodId=food.id, quantity=Decimal(quantity)))
    databaseSession.commit()


def test_newHouseholdListsDefaultStorageLocations(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, annaHeaders)

    storageLocations = listStorageLocations(client, annaHeaders, household["id"])

    assert [(location["name"], location["kind"]) for location in storageLocations] == [
        ("Fridge", "fridge"),
        ("Freezer", "freezer"),
        ("Pantry", "pantry"),
    ]


def test_anyMemberCanCreateRenameAndDeleteStorageLocation(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, annaHeaders)
    joinHousehold(client, petrHeaders, household["inviteCode"])

    created = client.post(
        f"/households/{household['id']}/storage-locations", json={"name": " Cellar "}, headers=petrHeaders
    )
    assert created.status_code == 201
    assert created.json()["name"] == "Cellar"
    assert created.json()["kind"] == "custom"
    storageLocationId = created.json()["id"]

    renamed = client.patch(
        f"/storage-locations/{storageLocationId}", json={"name": "Basement"}, headers=annaHeaders
    )
    assert renamed.status_code == 200
    assert renamed.json() == {**created.json(), "name": "Basement"}

    changedKind = client.patch(f"/storage-locations/{storageLocationId}", json={"kind": "pantry"}, headers=annaHeaders)
    assert changedKind.json()["kind"] == "pantry"
    assert changedKind.json()["name"] == "Basement"

    assert client.delete(f"/storage-locations/{storageLocationId}", headers=petrHeaders).status_code == 204
    assert len(listStorageLocations(client, annaHeaders, household["id"])) == 3


def test_storageLocationRejectsBlankNameAndUnknownKind(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, annaHeaders)
    url = f"/households/{household['id']}/storage-locations"

    assert client.post(url, json={"name": "  "}, headers=annaHeaders).status_code == 422
    assert client.post(url, json={"name": "Box", "kind": "garage"}, headers=annaHeaders).status_code == 422


def test_strangerCannotSeeOrChangeStorageLocations(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    household = createHousehold(client, annaHeaders)
    storageLocationId = listStorageLocations(client, annaHeaders, household["id"])[0]["id"]

    assert client.get(f"/households/{household['id']}/storage-locations", headers=strangerHeaders).status_code == 404
    assert client.post(
        f"/households/{household['id']}/storage-locations", json={"name": "Mine"}, headers=strangerHeaders
    ).status_code == 404
    assert client.patch(
        f"/storage-locations/{storageLocationId}", json={"name": "Mine"}, headers=strangerHeaders
    ).status_code == 404
    assert client.delete(f"/storage-locations/{storageLocationId}", headers=strangerHeaders).status_code == 404
    assert client.patch("/storage-locations/999999", json={"name": "X"}, headers=annaHeaders).status_code == 404


def test_storageLocationWithFoodCannotBeDeleted(client: TestClient, databaseSession: Session) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, annaHeaders)
    fridgeId = listStorageLocations(client, annaHeaders, household["id"])[0]["id"]
    addStockItem(databaseSession, household["id"], fridgeId, quantity=250)

    response = client.delete(f"/storage-locations/{fridgeId}", headers=annaHeaders)

    assert response.status_code == 409
    assert len(listStorageLocations(client, annaHeaders, household["id"])) == 3


def test_deletingStorageLocationMovesUsedUpFoodToAnotherLocation(
    client: TestClient, databaseSession: Session
) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, annaHeaders)
    fridgeId, freezerId, pantryId = [
        location["id"] for location in listStorageLocations(client, annaHeaders, household["id"])
    ]
    addStockItem(databaseSession, household["id"], freezerId, quantity=0)

    assert client.delete(f"/storage-locations/{freezerId}", headers=annaHeaders).status_code == 204

    databaseSession.expire_all()
    assert databaseSession.scalar(select(StockItem.storageLocationId)) == fridgeId


def test_lastStorageLocationWithStockHistoryCannotBeDeleted(client: TestClient, databaseSession: Session) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, annaHeaders)
    fridgeId, freezerId, pantryId = [
        location["id"] for location in listStorageLocations(client, annaHeaders, household["id"])
    ]
    addStockItem(databaseSession, household["id"], pantryId, quantity=0)
    assert client.delete(f"/storage-locations/{fridgeId}", headers=annaHeaders).status_code == 204
    assert client.delete(f"/storage-locations/{freezerId}", headers=annaHeaders).status_code == 204

    response = client.delete(f"/storage-locations/{pantryId}", headers=annaHeaders)

    assert response.status_code == 409
    assert databaseSession.scalar(select(func.count()).select_from(StockItem)) == 1
