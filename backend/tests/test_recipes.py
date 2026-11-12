import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import Food
from tests.helpers import createHousehold, joinHousehold, registerAndAuthorize
from tests.test_foods import createFood


class Kitchen:
    def __init__(self, client: TestClient) -> None:
        self.client = client
        self.anna = registerAndAuthorize(client, "anna@example.com", "Anna")
        household = createHousehold(client, self.anna)
        self.householdId = household["id"]
        self.inviteCode = household["inviteCode"]
        locations = client.get(f"/households/{self.householdId}/storage-locations", headers=self.anna).json()
        self.fridgeId = locations[0]["id"]

    def food(self, name: str, genericName: str | None = None, baseUnit: str = "milliliter") -> int:
        return createFood(
            self.client, self.anna, self.householdId, name, genericName=genericName, baseUnit=baseUnit
        ).json()["id"]

    def stock(self, foodId: int, quantity: float, expirationDate: str | None = None) -> int:
        return self.client.post(
            f"/households/{self.householdId}/stock-items",
            json={"foodId": foodId, "storageLocationId": self.fridgeId, "quantity": quantity, "expirationDate": expirationDate},
            headers=self.anna,
        ).json()["id"]

    def recipe(self, ingredients: list[dict], servings: int = 4, headers: dict[str, str] | None = None, **fields):
        body = {"name": "Palačinky", "servings": servings, "ingredients": ingredients, **fields}
        return self.client.post(f"/households/{self.householdId}/recipes", json=body, headers=headers or self.anna)

    def availability(self, recipeId: int, headers: dict[str, str] | None = None, **parameters) -> dict:
        return self.client.get(
            f"/recipes/{recipeId}/availability", params=parameters, headers=headers or self.anna
        ).json()


def ingredientFor(availability: dict, foodName: str) -> dict:
    return next(item for item in availability["ingredients"] if item["food"]["name"] == foodName)


@pytest.mark.predefinedRecipes
def test_newHouseholdGetsPredefinedRecipesAndTheirFoods(client: TestClient, databaseSession: Session) -> None:
    kitchen = Kitchen(client)

    recipes = client.get(f"/households/{kitchen.householdId}/recipes", headers=kitchen.anna).json()

    assert [recipe["name"] for recipe in recipes] == [
        "Hovězí guláš",
        "Rajská omáčka",
        "Smažený sýr",
        "Svíčková na smetaně",
        "Vepřo knedlo zelo",
    ]
    assert all(recipe["isPredefined"] and recipe["missingCount"] > 0 for recipe in recipes)
    assert databaseSession.scalar(select(func.count()).select_from(Food)) == 34
    svickova = client.get(f"/recipes/{recipes[3]['id']}", headers=kitchen.anna).json()
    assert "Smetanu rozmíchej s moukou" in svickova["instructions"]
    flour = next(item for item in svickova["ingredients"] if item["food"]["name"] == "Mouka hladká")
    assert (flour["quantity"], flour["acceptsAnyOfKind"], flour["food"]["genericName"]) == (30, False, "Mouka")
    salt = next(item for item in svickova["ingredients"] if item["food"]["name"] == "Sůl")
    assert salt["isOptional"] is True


def test_createUpdateAndDeleteRecipe(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milkId = kitchen.food("Mléko polotučné", "Mléko")

    created = kitchen.recipe(
        [
            {"foodId": milkId, "quantity": 500},
            {"newFood": {"name": "mouka hladká", "genericName": "Mouka", "baseUnit": "gram"}, "quantity": 250, "acceptsAnyOfKind": False},
            {"newFood": {"name": "Sůl", "baseUnit": "gram"}, "quantity": 2, "isOptional": True},
        ],
        preparationMinutes=30,
        instructions="Smíchej a usmaž.",
    )

    assert created.status_code == 201
    recipe = created.json()
    assert (recipe["name"], recipe["servings"], recipe["preparationMinutes"], recipe["isPredefined"]) == ("Palačinky", 4, 30, False)
    assert [(item["food"]["name"], item["quantity"]) for item in recipe["ingredients"]] == [
        ("Mléko polotučné", 500),
        ("Mouka hladká", 250),
        ("Sůl", 2),
    ]
    assert recipe["missingCount"] == 2

    updated = kitchen.client.patch(
        f"/recipes/{recipe['id']}",
        json={"name": "Lívance", "preparationMinutes": None, "ingredients": [{"foodId": milkId, "quantity": 300}]},
        headers=kitchen.anna,
    ).json()
    assert (updated["name"], updated["preparationMinutes"], updated["instructions"]) == ("Lívance", None, "Smíchej a usmaž.")
    assert [item["quantity"] for item in updated["ingredients"]] == [300]

    assert kitchen.client.delete(f"/recipes/{recipe['id']}", headers=kitchen.anna).status_code == 204
    assert kitchen.client.get(f"/recipes/{recipe['id']}", headers=kitchen.anna).status_code == 404


def test_recipeValidation(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milkId = kitchen.food("Mléko")

    assert kitchen.recipe([{"foodId": milkId, "quantity": 1}, {"foodId": milkId, "quantity": 2}]).status_code == 422
    assert kitchen.recipe([{"foodId": 999999, "quantity": 1}]).json()["detail"] == "Ingredient 1: food not found"
    assert kitchen.recipe([{"quantity": 1}]).status_code == 422
    assert kitchen.recipe([{"foodId": milkId, "quantity": 0}]).status_code == 422
    assert kitchen.recipe([], servings=0).status_code == 422


def test_genericIngredientAcceptsAnyFoodOfTheSameKindAndUnit(client: TestClient) -> None:
    kitchen = Kitchen(client)
    semiSkimmed = kitchen.food("Mléko polotučné", "Mléko")
    whole = kitchen.food("Mléko plnotučné", "Mléko")
    powdered = kitchen.food("Mléko sušené", "Mléko", baseUnit="gram")
    plainFlour = kitchen.food("Mouka hladká", "Mouka", baseUnit="gram")
    coarseFlour = kitchen.food("Mouka hrubá", "Mouka", baseUnit="gram")
    kitchen.stock(whole, 300)
    kitchen.stock(powdered, 500)
    kitchen.stock(coarseFlour, 1000)
    recipeId = kitchen.recipe(
        [
            {"foodId": semiSkimmed, "quantity": 500},
            {"foodId": plainFlour, "quantity": 250, "acceptsAnyOfKind": False},
        ]
    ).json()["id"]

    availability = kitchen.availability(recipeId)

    milk = ingredientFor(availability, "Mléko polotučné")
    flour = ingredientFor(availability, "Mouka hladká")
    assert (milk["availableQuantity"], milk["missingQuantity"]) == (300, 200)
    assert (flour["availableQuantity"], flour["missingQuantity"]) == (0, 250)
    assert availability["missingCount"] == 2

    kitchen.stock(semiSkimmed, 1000)
    kitchen.stock(plainFlour, 1000)
    assert kitchen.availability(recipeId)["missingCount"] == 0


def test_servingsScaleAndOptionalIngredientsDoNotCount(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    salt = kitchen.food("Sůl", "Sůl", baseUnit="gram")
    kitchen.stock(milk, 600)
    recipeId = kitchen.recipe(
        [{"foodId": milk, "quantity": 500}, {"foodId": salt, "quantity": 5, "isOptional": True}]
    ).json()["id"]

    forFour = kitchen.availability(recipeId)
    forSix = kitchen.availability(recipeId, servings=6)

    assert forFour["missingCount"] == 0
    assert ingredientFor(forFour, "Sůl")["missingQuantity"] == 5
    assert forFour["ingredients"][-1]["food"]["name"] == "Sůl"
    assert (forSix["servings"], ingredientFor(forSix, "Mléko")["requiredQuantity"]) == (6, 750)
    assert forSix["missingCount"] == 1


def test_availabilityFollowsTheReservationRule(client: TestClient) -> None:
    kitchen = Kitchen(client)
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")
    joinHousehold(client, petr, kitchen.inviteCode)
    milk = kitchen.food("Mléko", "Mléko")
    stockItemId = kitchen.stock(milk, 1000)
    pancakes = kitchen.recipe([{"foodId": milk, "quantity": 500}]).json()["id"]
    omelette = kitchen.recipe([{"foodId": milk, "quantity": 100}], name="Omeleta").json()["id"]

    def reserve(headers: dict[str, str], quantity: float, recipeId: int | None = None) -> None:
        response = client.post(
            f"/households/{kitchen.householdId}/reservations",
            json={"stockItemId": stockItemId, "quantity": quantity, "recipeId": recipeId},
            headers=headers,
        )
        assert response.status_code == 201

    reserve(petr, 200)
    reserve(kitchen.anna, 100)
    reserve(kitchen.anna, 300, omelette)
    reserve(kitchen.anna, 150, pancakes)

    milkForAnna = ingredientFor(kitchen.availability(pancakes), "Mléko")
    assert milkForAnna["availableQuantity"] == 500
    assert (milkForAnna["reservedForRecipe"], milkForAnna["reservedByOthers"]) == (150, 200)
    milkForPetr = ingredientFor(kitchen.availability(pancakes, headers=petr), "Mléko")
    assert milkForPetr["availableQuantity"] == 450


def test_reserveIngredientsTakesTheEarliestExpiringStockOnce(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    flour = kitchen.food("Mouka", "Mouka", baseUnit="gram")
    later = kitchen.stock(milk, 1000, "2026-12-30")
    sooner = kitchen.stock(milk, 300, "2026-12-01")
    kitchen.stock(flour, 100)
    recipeId = kitchen.recipe([{"foodId": milk, "quantity": 500}, {"foodId": flour, "quantity": 250}]).json()["id"]

    first = client.post(f"/recipes/{recipeId}/reserve", json={}, headers=kitchen.anna).json()
    second = client.post(f"/recipes/{recipeId}/reserve", json={}, headers=kitchen.anna).json()

    assert ingredientFor(first, "Mléko")["reservedForRecipe"] == 500
    assert ingredientFor(first, "Mouka")["reservedForRecipe"] == 100
    assert ingredientFor(second, "Mléko")["reservedForRecipe"] == 500
    reservations = client.get(
        f"/households/{kitchen.householdId}/reservations", params={"status": "active"}, headers=kitchen.anna
    ).json()
    milkReservations = {entry["stockItemId"]: entry["quantity"] for entry in reservations if entry["foodName"] == "Mléko"}
    assert milkReservations == {sooner: 300, later: 200}
    assert all(entry["recipeId"] == recipeId for entry in reservations)


def test_strangersCannotSeeOrChangeRecipes(client: TestClient) -> None:
    kitchen = Kitchen(client)
    stranger = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    recipeId = kitchen.recipe([]).json()["id"]

    assert client.get(f"/recipes/{recipeId}", headers=stranger).status_code == 404
    assert client.get(f"/recipes/{recipeId}/availability", headers=stranger).status_code == 404
    assert client.post(f"/recipes/{recipeId}/reserve", json={}, headers=stranger).status_code == 404
    assert client.patch(f"/recipes/{recipeId}", json={"name": "X"}, headers=stranger).status_code == 404
    assert client.delete(f"/recipes/{recipeId}", headers=stranger).status_code == 404
    assert client.get(f"/households/{kitchen.householdId}/recipes", headers=stranger).status_code == 404


def saveReceipt(kitchen: Kitchen, purchasedOn: str, items: list[dict]) -> None:
    response = kitchen.client.post(
        f"/households/{kitchen.householdId}/receipts",
        json={"purchasedOn": purchasedOn, "totalAmount": sum(item["price"] for item in items), "items": items},
        headers=kitchen.anna,
    )
    assert response.status_code == 201


def receiptItem(foodId: int, quantity: float | None, unit: str | None, price: float) -> dict:
    return {"originalText": "X", "name": "X", "foodId": foodId, "quantity": quantity, "unit": unit, "price": price}


def test_priceEstimateUsesTheLatestReceiptPrice(client: TestClient) -> None:
    kitchen = Kitchen(client)
    semiSkimmed = kitchen.food("Mléko polotučné", "Mléko")
    whole = kitchen.food("Mléko plnotučné", "Mléko")
    flour = kitchen.food("Mouka hladká", "Mouka", baseUnit="gram")
    salt = kitchen.food("Sůl", "Sůl", baseUnit="gram")
    eggs = kitchen.food("Vejce", "Vejce", baseUnit="piece")
    saveReceipt(kitchen, "2026-10-01", [receiptItem(semiSkimmed, 1000, "milliliter", 24.90), receiptItem(flour, 1000, "gram", 19.90)])
    saveReceipt(kitchen, "2026-11-01", [receiptItem(semiSkimmed, 1000, "milliliter", 29.90), receiptItem(eggs, None, None, 49.90)])
    saveReceipt(kitchen, "2026-11-05", [receiptItem(whole, 1000, "milliliter", 34.90), receiptItem(salt, 1000, "gram", 9.90)])
    pancakes = kitchen.recipe(
        [
            {"foodId": semiSkimmed, "quantity": 500},
            {"foodId": flour, "quantity": 250, "acceptsAnyOfKind": False},
            {"foodId": eggs, "quantity": 2},
            {"foodId": salt, "quantity": 5, "isOptional": True},
        ]
    ).json()["id"]

    availability = kitchen.availability(pancakes)

    assert ingredientFor(availability, "Mléko polotučné")["estimatedPrice"] == 14.95
    assert ingredientFor(availability, "Mouka hladká")["estimatedPrice"] == 4.98
    assert ingredientFor(availability, "Vejce")["estimatedPrice"] is None
    assert (availability["estimatedPrice"], availability["pricedIngredientCount"], availability["requiredIngredientCount"]) == (
        19.93,
        2,
        3,
    )
    assert kitchen.availability(pancakes, servings=8)["estimatedPrice"] == 39.85


def test_priceFallsBackToTheSameKindOnlyForGenericIngredients(client: TestClient) -> None:
    kitchen = Kitchen(client)
    semiSkimmed = kitchen.food("Mléko polotučné", "Mléko")
    whole = kitchen.food("Mléko plnotučné", "Mléko")
    plainFlour = kitchen.food("Mouka hladká", "Mouka", baseUnit="gram")
    coarseFlour = kitchen.food("Mouka hrubá", "Mouka", baseUnit="gram")
    saveReceipt(kitchen, "2026-11-05", [receiptItem(whole, 1000, "milliliter", 30.00), receiptItem(coarseFlour, 1000, "gram", 20.00)])
    recipeId = kitchen.recipe(
        [
            {"foodId": semiSkimmed, "quantity": 500},
            {"foodId": plainFlour, "quantity": 500, "acceptsAnyOfKind": False},
        ]
    ).json()["id"]

    availability = kitchen.availability(recipeId)

    assert ingredientFor(availability, "Mléko polotučné")["estimatedPrice"] == 15
    assert ingredientFor(availability, "Mouka hladká")["estimatedPrice"] is None
    assert availability["estimatedPrice"] == 15


def stockQuantities(kitchen: Kitchen) -> dict[int, float]:
    items = kitchen.client.get(f"/households/{kitchen.householdId}/stock-items", headers=kitchen.anna).json()
    return {item["id"]: item["quantity"] for item in items}


def test_cookingUsesOwnRecipeReservationsFirstThenEarliestFreeStock(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    salt = kitchen.food("Sůl", "Sůl", baseUnit="gram")
    soon = kitchen.stock(milk, 300, "2026-12-01")
    later = kitchen.stock(milk, 1000, "2026-12-30")
    reservedLater = kitchen.stock(milk, 1000, "2027-01-30")
    recipeId = kitchen.recipe(
        [{"foodId": milk, "quantity": 800}, {"foodId": salt, "quantity": 5, "isOptional": True}]
    ).json()["id"]
    reservation = client.post(
        f"/households/{kitchen.householdId}/reservations",
        json={"stockItemId": reservedLater, "quantity": 600, "recipeId": recipeId},
        headers=kitchen.anna,
    ).json()

    response = client.post(f"/recipes/{recipeId}/cook", json={}, headers=kitchen.anna)

    assert response.status_code == 200
    cooked = {item["food"]["name"]: item for item in response.json()["ingredients"]}
    assert (cooked["Mléko"]["deductedQuantity"], cooked["Mléko"]["missingQuantity"]) == (800, 0)
    assert (cooked["Sůl"]["deductedQuantity"], cooked["Sůl"]["missingQuantity"]) == (0, 0)
    assert stockQuantities(kitchen) == {soon: 100, later: 1000, reservedLater: 400}
    reservations = client.get(f"/households/{kitchen.householdId}/reservations", headers=kitchen.anna).json()
    assert [(entry["id"], entry["status"]) for entry in reservations] == [(reservation["id"], "fulfilled")]
    movements = client.get(f"/stock-items/{reservedLater}/movements", headers=kitchen.anna).json()
    assert [(movement["reason"], movement["quantityChange"]) for movement in movements] == [("cooked", -600)]


def test_cookingNeverTakesFoodReservedByOthersOrForOtherRecipes(client: TestClient) -> None:
    kitchen = Kitchen(client)
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")
    joinHousehold(client, petr, kitchen.inviteCode)
    milk = kitchen.food("Mléko", "Mléko")
    stockItemId = kitchen.stock(milk, 1000)
    pancakes = kitchen.recipe([{"foodId": milk, "quantity": 800}]).json()["id"]
    omelette = kitchen.recipe([{"foodId": milk, "quantity": 100}], name="Omeleta").json()["id"]
    for headers, quantity, recipeId in [(petr, 300, None), (kitchen.anna, 200, omelette), (kitchen.anna, 100, None)]:
        client.post(
            f"/households/{kitchen.householdId}/reservations",
            json={"stockItemId": stockItemId, "quantity": quantity, "recipeId": recipeId},
            headers=headers,
        )

    cooked = client.post(f"/recipes/{pancakes}/cook", json={}, headers=kitchen.anna).json()["ingredients"][0]

    assert (cooked["deductedQuantity"], cooked["missingQuantity"]) == (500, 300)
    assert stockQuantities(kitchen) == {stockItemId: 500}
    active = client.get(
        f"/households/{kitchen.householdId}/reservations", params={"status": "active"}, headers=kitchen.anna
    ).json()
    assert sorted((entry["userDisplayName"], entry["quantity"], entry["recipeId"]) for entry in active) == [
        ("Anna", 200, omelette),
        ("Petr", 300, None),
    ]


def test_cookingScalesServingsAndDeductsOptionalIngredientsWhenPresent(client: TestClient) -> None:
    kitchen = Kitchen(client)
    milk = kitchen.food("Mléko", "Mléko")
    salt = kitchen.food("Sůl", "Sůl", baseUnit="gram")
    milkItem = kitchen.stock(milk, 1000)
    saltItem = kitchen.stock(salt, 3)
    recipeId = kitchen.recipe(
        [{"foodId": milk, "quantity": 400}, {"foodId": salt, "quantity": 4, "isOptional": True}]
    ).json()["id"]

    response = client.post(f"/recipes/{recipeId}/cook", json={"servings": 2}, headers=kitchen.anna).json()

    assert response["servings"] == 2
    assert stockQuantities(kitchen) == {milkItem: 800, saltItem: 1}
    assert client.post(f"/recipes/{recipeId}/cook", json={}, headers=registerAndAuthorize(client, "x@example.com", "X")).status_code == 404
