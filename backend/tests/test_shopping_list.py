from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.models import ShoppingListItem

from tests.helpers import joinHousehold, registerAndAuthorize
from tests.test_recipes import Kitchen


def listItems(client: TestClient, kitchen: Kitchen, headers: dict[str, str]) -> list[dict]:
    response = client.get(f"/households/{kitchen.householdId}/shopping-list", headers=headers)
    assert response.status_code == 200
    return response.json()


def addItem(client: TestClient, kitchen: Kitchen, headers: dict[str, str], **body):
    return client.post(f"/households/{kitchen.householdId}/shopping-list", json=body, headers=headers)


def test_sharedAndPersonalItems(client: TestClient) -> None:
    kitchen = Kitchen(client)
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")
    joinHousehold(client, petr, kitchen.inviteCode)
    milk = kitchen.food("Mléko", "Mléko")

    shared = addItem(client, kitchen, kitchen.anna, foodId=milk, quantity=1000)
    assert shared.status_code == 201
    assert (shared.json()["name"], shared.json()["quantity"], shared.json()["isPersonal"]) == ("Mléko", 1000, False)
    personal = addItem(client, kitchen, kitchen.anna, name="Papírové utěrky", note="2 balení", isPersonal=True).json()
    assert (personal["food"], personal["note"], personal["createdByDisplayName"]) == (None, "2 balení", "Anna")

    assert [item["name"] for item in listItems(client, kitchen, kitchen.anna)] == ["Mléko", "Papírové utěrky"]
    assert [item["name"] for item in listItems(client, kitchen, petr)] == ["Mléko"]
    personalUrl = f"/shopping-list-items/{personal['id']}"
    assert client.patch(personalUrl, json={"isChecked": True}, headers=petr).status_code == 404
    assert client.delete(f"/shopping-list-items/{personal['id']}", headers=petr).status_code == 404

    moved = client.patch(f"/shopping-list-items/{personal['id']}", json={"isPersonal": False}, headers=kitchen.anna)
    assert moved.json()["isPersonal"] is False
    assert len(listItems(client, kitchen, petr)) == 2
    for invalid in [{}, {"foodId": milk, "name": "Mléko"}, {"name": " "}, {"foodId": milk, "quantity": 0}]:
        assert addItem(client, kitchen, kitchen.anna, **invalid).status_code == 422


def test_sameFoodIsMergedUntilChecked(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    first = addItem(client, kitchen, kitchen.anna, foodId=milk, quantity=500).json()
    second = addItem(client, kitchen, kitchen.anna, foodId=milk, quantity=1000).json()
    assert (second["id"], second["quantity"]) == (first["id"], 1500)
    personal = addItem(client, kitchen, kitchen.anna, foodId=milk, isPersonal=True).json()
    assert personal["id"] != first["id"]

    firstUrl = f"/shopping-list-items/{first['id']}"
    checked = client.patch(firstUrl, json={"isChecked": True}, headers=kitchen.anna).json()
    assert (checked["isChecked"], checked["checkedByDisplayName"]) == (True, "Anna")
    third = addItem(client, kitchen, kitchen.anna, foodId=milk, quantity=250).json()
    assert third["id"] not in (first["id"], personal["id"])
    assert [item["isChecked"] for item in listItems(client, kitchen, kitchen.anna)] == [False, False, True]

    clearUrl = f"/households/{kitchen.householdId}/shopping-list/checked"
    assert client.delete(clearUrl, headers=kitchen.anna).status_code == 204
    assert [item["id"] for item in listItems(client, kitchen, kitchen.anna)] == [personal["id"], third["id"]]


def test_missingRecipeIngredientsGoToTheList(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    eggs = kitchen.food("Vejce", "Vejce", baseUnit="piece")
    salt = kitchen.food("Sůl", "Sůl", baseUnit="gram")
    kitchen.stock(milk, 300)
    recipeId = kitchen.recipe(
        [
            {"foodId": milk, "quantity": 500},
            {"foodId": eggs, "quantity": 3},
            {"foodId": salt, "quantity": 5, "isOptional": True},
        ],
        servings=4,
    ).json()["id"]

    response = client.post(f"/recipes/{recipeId}/shopping-list", json={"servings": 2}, headers=kitchen.anna).json()

    assert response["addedCount"] == 1
    added = [(item["name"], item["quantity"], item["recipeName"]) for item in response["items"]]
    assert added == [("Vejce", 2, "Palačinky")]
    again = client.post(f"/recipes/{recipeId}/shopping-list", json={}, headers=kitchen.anna).json()
    assert {item["name"]: item["quantity"] for item in again["items"]} == {"Mléko": 200, "Vejce": 5}
    stranger = registerAndAuthorize(client, "x@example.com", "X")
    assert client.post(f"/recipes/{recipeId}/shopping-list", json={}, headers=stranger).status_code == 404


def test_leavingTheHouseholdRemovesOnlyPersonalItems(client: TestClient, databaseSession: Session) -> None:
    kitchen = Kitchen(client)
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")
    joinHousehold(client, petr, kitchen.inviteCode)
    addItem(client, kitchen, petr, name="Pivo", isPersonal=True)
    addItem(client, kitchen, petr, name="Chleba")
    petrId = client.get("/auth/me", headers=petr).json()["id"]

    response = client.delete(f"/households/{kitchen.householdId}/members/{petrId}", headers=petr)

    assert response.status_code == 204
    assert databaseSession.scalars(select(ShoppingListItem.name)).all() == ["Chleba"]
