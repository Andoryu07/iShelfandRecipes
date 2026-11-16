from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.accounts import purgeInactiveGuests
from application.models import Household, User
from tests.helpers import authorizationHeader, createHousehold, registerAndAuthorize, requestToJoin
from tests.test_foods import createFood


def startAsGuest(client: TestClient) -> dict[str, str]:
    response = client.post("/auth/guest", json={"householdName": "Moje domácnost"})
    assert response.status_code == 201
    return authorizationHeader(response.json()["accessToken"])


def test_guestGetsAHouseholdAndTheGuestPlan(client: TestClient) -> None:
    headers = startAsGuest(client)

    me = client.get("/auth/me", headers=headers).json()
    assert (me["isGuest"], me["email"], me["displayName"]) == (True, None, "Host")
    households = client.get("/households", headers=headers).json()
    assert [(household["name"], household["canShare"]) for household in households] == [("Moje domácnost", False)]
    plan = client.get("/auth/me/plan", headers=headers).json()
    assert plan["plan"] == "guest"
    assert plan["receiptScans"] == {"used": 0, "limit": 1, "period": "total"}
    assert plan["recipeScans"]["limit"] == 0
    assert (plan["canShareHousehold"], plan["canUploadFoodPhotos"], plan["rewardedAdsLeftToday"]) == (False, False, 0)
    assert client.post("/auth/me/premium/test-activation", headers=headers).status_code == 404


def test_guestCannotShareJoinOrUploadPhotos(client: TestClient) -> None:
    headers = startAsGuest(client)
    householdId = client.get("/households", headers=headers).json()[0]["id"]
    inviteCode = client.get("/households", headers=headers).json()[0]["inviteCode"]
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    annaHousehold = createHousehold(client, annaHeaders)

    assert client.post(f"/households/{householdId}/invite-links", headers=headers).status_code == 403
    assert requestToJoin(client, annaHeaders, inviteCode).status_code in (403, 409)
    assert requestToJoin(client, headers, annaHousehold["inviteCode"]).status_code == 403
    assert client.post("/households", json={"name": "Další"}, headers=headers).status_code == 409
    food = createFood(client, headers, householdId, "Mléko").json()
    files = {"file": ("photo.webp", b"webp", "image/webp")}
    assert client.put(f"/foods/{food['id']}/photo", files=files, headers=headers).status_code == 403


def test_guestCanBecomeAFullAccountAndKeepData(client: TestClient) -> None:
    headers = startAsGuest(client)
    householdId = client.get("/households", headers=headers).json()[0]["id"]
    createFood(client, headers, householdId, "Mléko")
    registerAndAuthorize(client, "taken@example.com", "Taken")

    body = {"email": "taken@example.com", "password": "nove-heslo-123", "displayName": "Jana"}
    assert client.post("/auth/me/upgrade", json=body, headers=headers).status_code == 409
    upgraded = client.post("/auth/me/upgrade", json={**body, "email": "Jana@Example.com"}, headers=headers)
    assert (upgraded.status_code, upgraded.json()["isGuest"], upgraded.json()["email"]) == (200, False, "jana@example.com")
    assert client.post("/auth/me/upgrade", json=body, headers=headers).status_code == 409

    login = client.post("/auth/login", json={"email": "jana@example.com", "password": "nove-heslo-123"})
    loginHeaders = authorizationHeader(login.json()["accessToken"])
    foods = client.get(f"/households/{householdId}/foods", headers=loginHeaders).json()
    assert [food["name"] for food in foods] == ["Mléko"]
    assert client.get("/auth/me/plan", headers=loginHeaders).json()["plan"] == "free"


def test_guestCanDeleteTheAccountRightAway(client: TestClient, databaseSession: Session) -> None:
    headers = startAsGuest(client)

    assert client.request("DELETE", "/auth/me", json={"password": ""}, headers=headers).status_code == 204
    assert databaseSession.scalar(select(func.count()).select_from(User)) == 0
    assert databaseSession.scalar(select(func.count()).select_from(Household)) == 0


def test_inactiveGuestsAreDeletedAfterSixtyDays(client: TestClient, databaseSession: Session) -> None:
    startAsGuest(client)
    startAsGuest(client)
    registerAndAuthorize(client, "anna@example.com", "Anna")
    guests = databaseSession.scalars(select(User).where(User.isGuest.is_(True)).order_by(User.id)).all()
    guests[0].lastActiveAt = datetime.now(timezone.utc) - timedelta(days=61)
    databaseSession.commit()

    assert purgeInactiveGuests(databaseSession, datetime.now(timezone.utc)) == 1
    assert databaseSession.scalar(select(func.count()).select_from(User)) == 2


def test_tooManyGuestsFromOneAddressAreRefused(client: TestClient) -> None:
    statuses = [client.post("/auth/guest", json={"householdName": "Doma"}).status_code for _ in range(6)]

    assert statuses == [201] * 5 + [429]


def test_guestCannotSignInWithTheGeneratedEmail(client: TestClient, databaseSession: Session) -> None:
    startAsGuest(client)
    email = databaseSession.scalar(select(User.email).where(User.isGuest.is_(True)))

    assert client.post("/auth/login", json={"email": email, "password": "whatever"}).status_code in (401, 422)
