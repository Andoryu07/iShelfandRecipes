from concurrent.futures import ThreadPoolExecutor

from fastapi.testclient import TestClient

from tests.helpers import createHousehold, joinHousehold, registerAndAuthorize
from tests.test_foods import createFood


class SharedStock:
    def __init__(self, client: TestClient, quantity: float = 1000) -> None:
        self.client = client
        self.anna = registerAndAuthorize(client, "anna@example.com", "Anna")
        self.petr = registerAndAuthorize(client, "petr@example.com", "Petr")
        household = createHousehold(client, self.anna)
        self.householdId = household["id"]
        joinHousehold(client, self.petr, household["inviteCode"])
        foodId = createFood(client, self.anna, self.householdId, "Mléko", baseUnit="milliliter").json()["id"]
        fridgeId = client.get(f"/households/{self.householdId}/storage-locations", headers=self.anna).json()[0]["id"]
        self.stockItemId = client.post(
            f"/households/{self.householdId}/stock-items",
            json={"foodId": foodId, "storageLocationId": fridgeId, "quantity": quantity},
            headers=self.anna,
        ).json()["id"]

    def reserve(self, headers: dict[str, str], quantity: float, **fields):
        body = {"stockItemId": self.stockItemId, "quantity": quantity, **fields}
        return self.client.post(f"/households/{self.householdId}/reservations", json=body, headers=headers)

    def writeOff(self, headers: dict[str, str], **body):
        return self.client.post(f"/stock-items/{self.stockItemId}/movements", json=body, headers=headers)

    def stockItem(self) -> dict:
        items = self.client.get(f"/households/{self.householdId}/stock-items", headers=self.anna).json()
        return next(item for item in items if item["id"] == self.stockItemId)

    def reservations(self, **parameters) -> list[dict]:
        return self.client.get(
            f"/households/{self.householdId}/reservations", params=parameters, headers=self.anna
        ).json()


def test_reservationIsVisibleToTheWholeHousehold(client: TestClient) -> None:
    stock = SharedStock(client)

    response = stock.reserve(stock.anna, 300, note=" na palačinky ")

    assert response.status_code == 201
    reservation = response.json()
    assert (reservation["userDisplayName"], reservation["foodName"], reservation["quantity"], reservation["note"]) == (
        "Anna",
        "Mléko",
        300,
        "na palačinky",
    )
    assert reservation["status"] == "active"
    item = client.get(f"/households/{stock.householdId}/stock-items", headers=stock.petr).json()[0]
    assert (item["quantity"], item["reservedQuantity"], item["availableQuantity"]) == (1000, 300, 700)
    assert [entry["id"] for entry in item["reservations"]] == [reservation["id"]]
    assert [entry["id"] for entry in stock.reservations(status="active")] == [reservation["id"]]


def test_canReserveOnlyTheFreeQuantity(client: TestClient) -> None:
    stock = SharedStock(client)
    stock.reserve(stock.anna, 600)

    assert stock.reserve(stock.petr, 401).status_code == 409
    assert stock.reserve(stock.petr, 400).status_code == 201
    assert stock.reserve(stock.anna, 1).status_code == 409


def test_othersCanEatOnlyTheFreeQuantity(client: TestClient) -> None:
    stock = SharedStock(client)
    stock.reserve(stock.anna, 600)

    assert stock.writeOff(stock.petr, reason="eaten", quantity=401).status_code == 409
    assert stock.writeOff(stock.petr, reason="eaten", quantity=400).status_code == 201
    assert stock.stockItem()["reservedQuantity"] == 600


def test_authorEatsFreeFoodFirstThenTheirReservation(client: TestClient) -> None:
    stock = SharedStock(client)
    reservationId = stock.reserve(stock.anna, 600).json()["id"]

    stock.writeOff(stock.anna, reason="eaten", quantity=300)
    assert stock.stockItem()["reservations"][0]["quantity"] == 600

    stock.writeOff(stock.anna, reason="eaten", quantity=300)
    assert stock.stockItem()["reservations"][0]["quantity"] == 400

    stock.writeOff(stock.anna, reason="eaten", quantity=400)
    finished = next(entry for entry in stock.reservations() if entry["id"] == reservationId)
    assert finished["status"] == "fulfilled"
    assert stock.reservations(status="active") == []


def test_spoiledFoodCutsReservationsNewestFirst(client: TestClient) -> None:
    stock = SharedStock(client)
    older = stock.reserve(stock.anna, 400).json()
    newer = stock.reserve(stock.anna, 400).json()
    petrReservation = stock.reserve(stock.petr, 200).json()

    assert stock.writeOff(stock.petr, reason="spoiled", quantity=500).status_code == 201

    byId = {entry["id"]: entry for entry in stock.reservations()}
    assert byId[petrReservation["id"]]["status"] == "cancelled"
    assert (byId[newer["id"]]["status"], byId[newer["id"]]["quantity"]) == ("active", 100)
    assert (byId[older["id"]]["status"], byId[older["id"]]["quantity"]) == ("active", 400)
    assert stock.stockItem()["reservedQuantity"] == 500


def test_correctionDownCutsReservations(client: TestClient) -> None:
    stock = SharedStock(client)
    reservation = stock.reserve(stock.anna, 800).json()

    stock.writeOff(stock.petr, reason="correction", newQuantity=500)

    assert stock.reservations()[0]["quantity"] == 500
    assert stock.reservations()[0]["id"] == reservation["id"]


def test_onlyTheAuthorChangesOrCancels(client: TestClient) -> None:
    stock = SharedStock(client)
    reservationId = stock.reserve(stock.anna, 300).json()["id"]
    stock.reserve(stock.petr, 500)

    assert client.patch(f"/reservations/{reservationId}", json={"quantity": 100}, headers=stock.petr).status_code == 403
    assert client.post(f"/reservations/{reservationId}/cancel", headers=stock.petr).status_code == 403
    assert client.patch(f"/reservations/{reservationId}", json={"quantity": 501}, headers=stock.anna).status_code == 409

    updated = client.patch(f"/reservations/{reservationId}", json={"quantity": 500, "note": "oběd"}, headers=stock.anna)
    assert (updated.json()["quantity"], updated.json()["note"]) == (500, "oběd")
    cleared = client.patch(f"/reservations/{reservationId}", json={"note": None}, headers=stock.anna)
    assert (cleared.json()["quantity"], cleared.json()["note"]) == (500, None)

    cancelled = client.post(f"/reservations/{reservationId}/cancel", headers=stock.anna)
    assert cancelled.json()["status"] == "cancelled"
    assert client.post(f"/reservations/{reservationId}/cancel", headers=stock.anna).status_code == 409
    assert stock.stockItem()["reservedQuantity"] == 500


def test_strangersAndForeignItemsGetNotFound(client: TestClient) -> None:
    stock = SharedStock(client)
    stranger = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    strangerHousehold = createHousehold(client, stranger)
    reservationId = stock.reserve(stock.anna, 100).json()["id"]

    assert stock.reserve(stranger, 100).status_code == 404
    foreign = client.post(
        f"/households/{strangerHousehold['id']}/reservations",
        json={"stockItemId": stock.stockItemId, "quantity": 100},
        headers=stranger,
    )
    assert foreign.status_code == 404
    assert client.post(f"/reservations/{reservationId}/cancel", headers=stranger).status_code == 404
    assert stock.reserve(stock.anna, 100, recipeId=999999).status_code == 404
    assert stock.reserve(stock.anna, 0).status_code == 422


def test_concurrentReservationsNeverExceedTheStock(client: TestClient) -> None:
    stock = SharedStock(client, quantity=100)

    with ThreadPoolExecutor(max_workers=10) as executor:
        statusCodes = list(executor.map(lambda _: stock.reserve(stock.anna, 20).status_code, range(10)))

    assert sorted(statusCodes) == [201] * 5 + [409] * 5
    assert stock.stockItem()["reservedQuantity"] == 100
