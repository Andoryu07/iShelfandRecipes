from fastapi.testclient import TestClient

from tests.helpers import registerAndAuthorize
from tests.test_recipes import Kitchen
from tests.test_stock_items import Household


def history(client: TestClient, household: Household, storageLocationId: int, headers: dict[str, str] | None = None):
    return client.get(f"/storage-locations/{storageLocationId}/history", headers=headers or household.headers)


def summary(events: list[dict]) -> list[tuple]:
    return [(event["kind"], event["food"]["name"], event["quantity"], event["otherStorageLocationId"]) for event in events]


def test_movingAnItemIsRecordedOnceAndOnlyByChangingTheLocation(client: TestClient) -> None:
    household = Household(client)
    stockItemId = household.addStockItem(household.createFood("Máslo"), 250).json()["id"]
    url = f"/stock-items/{stockItemId}"

    assert client.patch(url, json={"storageLocationId": household.fridgeId}, headers=household.headers).status_code == 200
    moved = client.patch(url, json={"storageLocationId": household.freezerId}, headers=household.headers)

    assert moved.json()["storageLocationId"] == household.freezerId
    movements = client.get(f"{url}/movements", headers=household.headers).json()
    assert [
        (m["reason"], m["quantityChange"], m["storageLocationId"], m["targetStorageLocationId"], m["userDisplayName"])
        for m in movements
    ] == [("moved", 0, household.fridgeId, household.freezerId, "Anna")]
    assert household.writeOff(stockItemId, reason="moved", quantity=1).status_code == 422
    foodId = household.listStockItems()[0]["food"]["id"]
    assert client.get(f"/foods/{foodId}/last-added-quantity", headers=household.headers).json() == {"quantity": 250}


def test_storageLocationHistoryShowsWhatHappenedThere(client: TestClient) -> None:
    household = Household(client)
    milkId = household.createFood("Mléko", baseUnit="milliliter")
    cheeseId = household.createFood("Sýr")
    milkItemId = household.addStockItem(milkId, 1000).json()["id"]
    household.writeOff(milkItemId, reason="eaten", quantity=200)
    client.patch(f"/stock-items/{milkItemId}", json={"storageLocationId": household.freezerId}, headers=household.headers)
    household.writeOff(milkItemId, reason="spoiled", quantity=300)
    household.addStockItem(cheeseId, 150, storageLocationId=household.pantryId)

    fridge = history(client, household, household.fridgeId).json()
    freezer = history(client, household, household.freezerId).json()
    pantry = history(client, household, household.pantryId).json()

    assert summary(fridge) == [
        ("movedOut", "Mléko", None, household.freezerId),
        ("eaten", "Mléko", 200, None),
        ("added", "Mléko", 1000, None),
    ]
    assert summary(freezer) == [("spoiled", "Mléko", 300, None), ("movedIn", "Mléko", None, household.fridgeId)]
    assert summary(pantry) == [("added", "Sýr", 150, None)]
    assert {event["userDisplayName"] for event in fridge + freezer + pantry} == {"Anna"}


def test_strangerCannotReadStorageLocationHistory(client: TestClient) -> None:
    household = Household(client)
    strangerHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")

    assert history(client, household, household.fridgeId, strangerHeaders).status_code == 404


def test_cookingIsRecordedInTheRecipeHistory(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    kitchen.stock(milk, 1000)
    recipeId = kitchen.recipe([{"foodId": milk, "quantity": 400}]).json()["id"]
    url = f"/recipes/{recipeId}/cookings"
    assert client.get(url, headers=kitchen.anna).json() == []

    client.post(f"/recipes/{recipeId}/cook", json={"servings": 2}, headers=kitchen.anna)
    client.post(f"/recipes/{recipeId}/cook", json={}, headers=kitchen.anna)

    cookings = client.get(url, headers=kitchen.anna).json()
    assert [(cooking["servings"], cooking["userDisplayName"]) for cooking in cookings] == [(4, "Anna"), (2, "Anna")]
    fridgeHistory = client.get(f"/storage-locations/{kitchen.fridgeId}/history", headers=kitchen.anna).json()
    assert [event["kind"] for event in fridgeHistory][:2] == ["cooked", "cooked"]
    stranger = registerAndAuthorize(client, "petr@example.com", "Petr")
    assert client.get(url, headers=stranger).status_code == 404


def test_householdCookingHistoryKeepsDeletedRecipes(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    kitchen.stock(milk, 2000)
    pancakesId = kitchen.recipe([{"foodId": milk, "quantity": 400}], name="Palačinky", icon="🥞").json()["id"]
    puddingId = kitchen.recipe([{"foodId": milk, "quantity": 500}], name="Pudink").json()["id"]
    client.post(f"/recipes/{pancakesId}/cook", json={"servings": 2}, headers=kitchen.anna)
    client.post(f"/recipes/{puddingId}/cook", json={}, headers=kitchen.anna)
    url = f"/households/{kitchen.householdId}/cookings"

    assert client.delete(f"/recipes/{puddingId}", headers=kitchen.anna).status_code == 204
    cookings = client.get(url, headers=kitchen.anna).json()

    assert [
        (cooking["recipeId"], cooking["recipeName"], cooking["recipeIcon"], cooking["servings"], cooking["userDisplayName"])
        for cooking in cookings
    ] == [(None, "Pudink", None, 4, "Anna"), (pancakesId, "Palačinky", "🥞", 2, "Anna")]
    stranger = registerAndAuthorize(client, "petr@example.com", "Petr")
    assert client.get(url, headers=stranger).status_code == 404
