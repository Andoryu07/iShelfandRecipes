from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from application.models import Reservation, User
from application.stock import todayInHouseholdTimeZone
from tests.helpers import createHousehold, joinHousehold, registerAndAuthorize
from tests.test_foods import createFood


class Household:
    def __init__(self, client: TestClient) -> None:
        self.client = client
        self.headers = registerAndAuthorize(client, "anna@example.com", "Anna")
        household = createHousehold(client, self.headers)
        self.id = household["id"]
        self.inviteCode = household["inviteCode"]
        locations = client.get(f"/households/{self.id}/storage-locations", headers=self.headers).json()
        self.fridgeId, self.freezerId, self.pantryId = [location["id"] for location in locations]

    def createFood(self, name: str, baseUnit: str = "gram") -> int:
        return createFood(self.client, self.headers, self.id, name, baseUnit=baseUnit).json()["id"]

    def addStockItem(self, foodId: int, quantity: float, storageLocationId: int | None = None, **fields):
        body = {"foodId": foodId, "storageLocationId": storageLocationId or self.fridgeId, "quantity": quantity, **fields}
        return self.client.post(f"/households/{self.id}/stock-items", json=body, headers=self.headers)

    def listStockItems(self, **parameters) -> list[dict]:
        response = self.client.get(f"/households/{self.id}/stock-items", params=parameters, headers=self.headers)
        assert response.status_code == 200
        return response.json()

    def writeOff(self, stockItemId: int, headers: dict[str, str] | None = None, **body):
        return self.client.post(f"/stock-items/{stockItemId}/movements", json=body, headers=headers or self.headers)


def daysFromToday(days: int) -> str:
    return (todayInHouseholdTimeZone() + timedelta(days=days)).isoformat()


def test_addStockItemReturnsFoodAndQuantities(client: TestClient) -> None:
    household = Household(client)
    milkId = household.createFood("Mléko", baseUnit="milliliter")

    response = household.addStockItem(milkId, 1000, expirationDate=daysFromToday(5))

    assert response.status_code == 201
    body = response.json()
    assert body["food"]["name"] == "Mléko"
    assert body["food"]["baseUnit"] == "milliliter"
    assert body["storageLocationId"] == household.fridgeId
    assert body["quantity"] == 1000
    assert body["reservedQuantity"] == 0
    assert body["availableQuantity"] == 1000
    assert body["expirationDate"] == daysFromToday(5)


def test_sameFoodIsNotMerged(client: TestClient) -> None:
    household = Household(client)
    milkId = household.createFood("Mléko", baseUnit="milliliter")

    household.addStockItem(milkId, 1000, expirationDate=daysFromToday(5))
    household.addStockItem(milkId, 1000, expirationDate=daysFromToday(5))

    assert len(household.listStockItems()) == 2


def test_addStockItemValidatesInput(client: TestClient) -> None:
    household = Household(client)
    milkId = household.createFood("Mléko")

    assert household.addStockItem(milkId, 0).status_code == 422
    assert household.addStockItem(milkId, -5).status_code == 422
    assert household.addStockItem(milkId, 1.2345).status_code == 422
    assert household.addStockItem(999999, 1).status_code == 404
    assert household.addStockItem(milkId, 1, storageLocationId=999999).status_code == 404


def test_cannotUseFoodOrStorageLocationOfAnotherHousehold(client: TestClient) -> None:
    household = Household(client)
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    petrHousehold = createHousehold(client, petrHeaders)
    petrFoodId = createFood(client, petrHeaders, petrHousehold["id"], "Sýr").json()["id"]
    petrLocationId = client.get(f"/households/{petrHousehold['id']}/storage-locations", headers=petrHeaders).json()[0]["id"]
    milkId = household.createFood("Mléko")

    assert household.addStockItem(petrFoodId, 1).status_code == 404
    assert household.addStockItem(milkId, 1, storageLocationId=petrLocationId).status_code == 404


def test_listIsSortedByExpirationAndFilterable(client: TestClient) -> None:
    household = Household(client)
    milkId = household.createFood("Mléko", baseUnit="milliliter")
    peasId = household.createFood("Hrášek")
    riceId = household.createFood("Rýže")
    yogurtId = household.createFood("Jogurt", baseUnit="piece")
    household.addStockItem(riceId, 1000, storageLocationId=household.pantryId)
    household.addStockItem(peasId, 450, storageLocationId=household.freezerId, expirationDate=daysFromToday(90))
    household.addStockItem(milkId, 1000, expirationDate=daysFromToday(2))
    household.addStockItem(yogurtId, 4, expirationDate=daysFromToday(-1))

    def names(**parameters) -> list[str]:
        return [item["food"]["name"] for item in household.listStockItems(**parameters)]

    assert names() == ["Jogurt", "Mléko", "Hrášek", "Rýže"]
    assert names(storageLocationId=household.fridgeId) == ["Jogurt", "Mléko"]
    assert names(expiringWithinDays=3) == ["Jogurt", "Mléko"]
    assert names(expiringWithinDays=0) == ["Jogurt"]
    assert names(search="ryze") == ["Rýže"]


def test_writeOffDecreasesQuantityAndUsedUpItemsDisappearFromList(client: TestClient) -> None:
    household = Household(client)
    milkId = household.createFood("Mléko", baseUnit="milliliter")
    stockItemId = household.addStockItem(milkId, 1000).json()["id"]

    eaten = household.writeOff(stockItemId, reason="eaten", quantity=250)
    assert eaten.status_code == 201
    assert eaten.json()["quantity"] == 750

    spoiled = household.writeOff(stockItemId, reason="spoiled", quantity=750)
    assert spoiled.json()["quantity"] == 0
    assert household.listStockItems() == []

    movements = client.get(f"/stock-items/{stockItemId}/movements", headers=household.headers).json()
    assert [(movement["reason"], movement["quantityChange"], movement["userDisplayName"]) for movement in movements] == [
        ("spoiled", -750, "Anna"),
        ("eaten", -250, "Anna"),
    ]


def test_cannotWriteOffMoreThanRemains(client: TestClient) -> None:
    household = Household(client)
    stockItemId = household.addStockItem(household.createFood("Mléko"), 100).json()["id"]

    assert household.writeOff(stockItemId, reason="eaten", quantity=100.001).status_code == 409
    assert household.listStockItems()[0]["quantity"] == 100


def test_correctionSetsNewQuantityUpOrDown(client: TestClient) -> None:
    household = Household(client)
    stockItemId = household.addStockItem(household.createFood("Vejce", baseUnit="piece"), 2).json()["id"]

    assert household.writeOff(stockItemId, reason="correction", newQuantity=3).json()["quantity"] == 3
    assert household.writeOff(stockItemId, reason="correction", newQuantity=3).status_code == 409
    assert household.writeOff(stockItemId, reason="correction", newQuantity=0).json()["quantity"] == 0
    movements = client.get(f"/stock-items/{stockItemId}/movements", headers=household.headers).json()
    assert [movement["quantityChange"] for movement in movements] == [-3, 1]


def test_movementRequestMustMatchReason(client: TestClient) -> None:
    household = Household(client)
    stockItemId = household.addStockItem(household.createFood("Mléko"), 100).json()["id"]

    assert household.writeOff(stockItemId, reason="cooked", quantity=10).status_code == 422
    assert household.writeOff(stockItemId, reason="eaten", newQuantity=10).status_code == 422
    assert household.writeOff(stockItemId, reason="correction", quantity=10).status_code == 422
    assert household.writeOff(stockItemId, reason="eaten", quantity=0).status_code == 422
    assert household.writeOff(stockItemId, reason="lost", quantity=10).status_code == 422


def test_updateMovesItemAndChangesOrClearsExpirationDate(client: TestClient) -> None:
    household = Household(client)
    stockItemId = household.addStockItem(household.createFood("Kuře"), 500, expirationDate=daysFromToday(2)).json()["id"]

    moved = client.patch(f"/stock-items/{stockItemId}", json={"storageLocationId": household.freezerId}, headers=household.headers)
    assert moved.json()["storageLocationId"] == household.freezerId
    assert moved.json()["expirationDate"] == daysFromToday(2)

    changed = client.patch(f"/stock-items/{stockItemId}", json={"expirationDate": daysFromToday(90)}, headers=household.headers)
    assert changed.json()["expirationDate"] == daysFromToday(90)

    cleared = client.patch(f"/stock-items/{stockItemId}", json={"expirationDate": None}, headers=household.headers)
    assert cleared.json()["expirationDate"] is None
    assert cleared.json()["storageLocationId"] == household.freezerId

    assert client.patch(
        f"/stock-items/{stockItemId}", json={"storageLocationId": 999999}, headers=household.headers
    ).status_code == 404


def test_reservationsLowerAvailableQuantity(client: TestClient, databaseSession: Session) -> None:
    household = Household(client)
    stockItemId = household.addStockItem(household.createFood("Mléko"), 1000).json()["id"]
    annaId = databaseSession.query(User.id).scalar()
    databaseSession.add(Reservation(stockItemId=stockItemId, userId=annaId, quantity=Decimal(300)))
    databaseSession.commit()

    item = household.listStockItems()[0]

    assert (item["quantity"], item["reservedQuantity"], item["availableQuantity"]) == (1000, 300, 700)


def test_membersShareStockAndStrangersGetNotFound(client: TestClient) -> None:
    household = Household(client)
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    joinHousehold(client, petrHeaders, household.inviteCode)
    stockItemId = household.addStockItem(household.createFood("Mléko"), 1000).json()["id"]

    petrList = client.get(f"/households/{household.id}/stock-items", headers=petrHeaders).json()
    assert [item["id"] for item in petrList] == [stockItemId]
    assert household.writeOff(stockItemId, headers=petrHeaders, reason="eaten", quantity=100).status_code == 201
    movements = client.get(f"/stock-items/{stockItemId}/movements", headers=household.headers).json()
    assert movements[0]["userDisplayName"] == "Petr"

    assert client.get(f"/households/{household.id}/stock-items", headers=strangerHeaders).status_code == 404
    assert household.writeOff(stockItemId, headers=strangerHeaders, reason="eaten", quantity=1).status_code == 404
    assert client.get(f"/stock-items/{stockItemId}/movements", headers=strangerHeaders).status_code == 404
    assert client.patch(f"/stock-items/{stockItemId}", json={"expirationDate": None}, headers=strangerHeaders).status_code == 404


def test_concurrentWriteOffsNeverGoBelowZero(client: TestClient) -> None:
    household = Household(client)
    stockItemId = household.addStockItem(household.createFood("Mléko"), 100).json()["id"]

    def writeOffTwenty(_: int) -> int:
        return household.writeOff(stockItemId, reason="eaten", quantity=20).status_code

    with ThreadPoolExecutor(max_workers=10) as executor:
        statusCodes = list(executor.map(writeOffTwenty, range(10)))

    assert sorted(statusCodes) == [201] * 5 + [409] * 5
    movements = client.get(f"/stock-items/{stockItemId}/movements", headers=household.headers).json()
    assert len(movements) == 5
