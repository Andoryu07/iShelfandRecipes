from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import Household, Receipt, RefreshToken, Reservation, StockItem, StockMovement, User
from tests.helpers import createHousehold, defaultPassword, joinHousehold, registerAndAuthorize
from tests.test_foods import createFood


def deleteAccount(client: TestClient, headers: dict[str, str], password: str = defaultPassword):
    return client.request("DELETE", "/auth/me", json={"password": password}, headers=headers)


def count(session: Session, model) -> int:
    session.expire_all()
    return session.scalar(select(func.count()).select_from(model))


def test_wrongPasswordKeepsTheAccount(client: TestClient, databaseSession: Session) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")

    assert deleteAccount(client, headers, password="wrong password").status_code == 403
    assert client.get("/auth/me", headers=headers).status_code == 200
    assert count(databaseSession, User) == 1


def test_deletingTheLastMemberDeletesTheHouseholdAndSignsOut(client: TestClient, databaseSession: Session) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    createHousehold(client, headers)

    response = deleteAccount(client, headers)

    assert response.status_code == 204
    assert client.cookies.get("refreshToken") is None
    assert client.get("/auth/me", headers=headers).status_code == 401
    for model in (User, Household, RefreshToken):
        assert count(databaseSession, model) == 0
    assert client.post("/auth/login", json={"email": "anna@example.com", "password": defaultPassword}).status_code == 401


def test_sharedDataStaysWithTheHouseholdWithoutTheUser(client: TestClient, databaseSession: Session) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, annaHeaders)
    joinHousehold(client, petrHeaders, household["inviteCode"])
    householdId = household["id"]
    foodId = createFood(client, annaHeaders, householdId, "Mléko", baseUnit="milliliter").json()["id"]
    fridgeId = client.get(f"/households/{householdId}/storage-locations", headers=annaHeaders).json()[0]["id"]
    stockItemId = client.post(
        f"/households/{householdId}/stock-items",
        json={"foodId": foodId, "storageLocationId": fridgeId, "quantity": 1000},
        headers=annaHeaders,
    ).json()["id"]
    client.post(f"/stock-items/{stockItemId}/movements", json={"reason": "eaten", "quantity": 100}, headers=annaHeaders)
    client.post(
        f"/households/{householdId}/receipts",
        json={"purchasedOn": "2026-11-10", "totalAmount": 24.9, "items": [{"originalText": "MLEKO", "name": "Mléko", "price": 24.9}]},
        headers=annaHeaders,
    )
    annaId = databaseSession.scalar(select(User.id).where(User.email == "anna@example.com"))
    databaseSession.add(Reservation(stockItemId=stockItemId, userId=annaId, quantity=Decimal(200)))
    databaseSession.commit()

    assert deleteAccount(client, annaHeaders).status_code == 204

    members = client.get(f"/households/{householdId}/members", headers=petrHeaders).json()
    assert [(member["displayName"], member["role"]) for member in members] == [("Petr", "owner")]
    assert count(databaseSession, Reservation) == 0
    assert count(databaseSession, StockItem) == 1
    assert databaseSession.scalar(select(StockMovement.userId)) is None
    assert databaseSession.scalar(select(Receipt.userId)) is None
    receipts = client.get(f"/households/{householdId}/receipts", headers=petrHeaders).json()
    assert receipts[0]["uploadedByDisplayName"] is None


def test_receiptConsentCanBeWithdrawn(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    client.post("/auth/me/receipt-consent", headers=headers)

    response = client.delete("/auth/me/receipt-consent", headers=headers)

    assert response.status_code == 200
    assert response.json()["receiptConsentGivenAt"] is None
    assert client.get("/auth/me", headers=headers).json()["receiptConsentGivenAt"] is None
