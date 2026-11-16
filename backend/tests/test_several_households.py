from datetime import timedelta

from fastapi.testclient import TestClient

from application.accounts import deleteAccountNow
from application.database import getSessionFactory
from application.models import User

from tests.helpers import createHousehold, joinHousehold, makePremium, registerAndAuthorize, requestToJoin
from tests.test_statistics import saveReceipt


def test_freeUserHasOneHouseholdAndPremiumThree(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    createHousehold(client, headers, "Doma")

    second = client.post("/households", json={"name": "Chata"}, headers=headers)
    assert (second.status_code, second.json()["detail"]) == (409, "The household limit is reached")

    makePremium("anna@example.com")
    assert client.post("/households", json={"name": "Chata"}, headers=headers).status_code == 201
    assert client.post("/households", json={"name": "Byt"}, headers=headers).status_code == 201
    assert client.post("/households", json={"name": "Navíc"}, headers=headers).status_code == 409
    names = [household["name"] for household in client.get("/households", headers=headers).json()]
    assert names == ["Doma", "Chata", "Byt"]


def test_premiumUserCanJoinAnotherHousehold(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    createHousehold(client, annaHeaders, "Doma")
    petrHousehold = createHousehold(client, petrHeaders, "U Petra")

    assert requestToJoin(client, annaHeaders, petrHousehold["inviteCode"]).status_code == 409
    makePremium("anna@example.com")
    assert joinHousehold(client, annaHeaders, petrHousehold["inviteCode"]).status_code == 202
    assert [household["name"] for household in client.get("/households", headers=annaHeaders).json()] == [
        "Doma",
        "U Petra",
    ]
    again = requestToJoin(client, annaHeaders, petrHousehold["inviteCode"])
    assert (again.status_code, again.json()["detail"]) == (409, "User already belongs to this household")


def test_accountDeletionLeavesEveryHousehold(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    makePremium("anna@example.com")
    first = createHousehold(client, annaHeaders, "Doma")
    second = createHousehold(client, annaHeaders, "Chata")
    joinHousehold(client, petrHeaders, first["inviteCode"])
    assert second["name"] == "Chata"

    with getSessionFactory()() as session:
        deleteAccountNow(session, session.query(User).filter_by(email="anna@example.com").one())
        session.commit()

    remaining = client.get("/households", headers=petrHeaders).json()
    assert [(household["name"], household["role"]) for household in remaining] == [("Doma", "owner")]


def lockedHousehold(client: TestClient) -> tuple[dict, dict[str, str], dict[str, str]]:
    ownerHeaders = registerAndAuthorize(client, "owner@example.com", "Owner")
    makePremium("owner@example.com")
    household = createHousehold(client, ownerHeaders)
    memberHeaders = {}
    for index in range(6):
        memberHeaders = registerAndAuthorize(client, f"member{index}@example.com", "Member")
        joinHousehold(client, memberHeaders, household["inviteCode"])
    makePremium("owner@example.com", days=-2)
    return household, ownerHeaders, memberHeaders


def test_householdOverTheMemberLimitIsLockedForChanges(client: TestClient) -> None:
    household, ownerHeaders, memberHeaders = lockedHousehold(client)
    householdId = household["id"]

    details = client.get(f"/households/{householdId}", headers=memberHeaders).json()
    assert (details["memberCount"], details["memberLimit"], details["isLocked"]) == (7, 6, True)
    created = client.post(f"/households/{householdId}/foods", json={"name": "Mléko", "baseUnit": "milliliter"}, headers=memberHeaders)
    assert (created.status_code, created.json()["detail"]) == (403, "The household is locked")
    assert client.post(f"/households/{householdId}/shopping-list", json={"name": "Chleba"}, headers=ownerHeaders).status_code == 403
    assert client.get(f"/households/{householdId}/stock-items", headers=memberHeaders).status_code == 200
    assert client.get(f"/households/{householdId}/exports/receipt-items", headers=memberHeaders).status_code == 200
    settings = client.patch(
        f"/households/{householdId}/notification-settings", json={"notificationHour": 9}, headers=memberHeaders
    )
    assert settings.status_code == 200

    members = client.get(f"/households/{householdId}/members", headers=ownerHeaders).json()
    assert client.delete(f"/households/{householdId}/members/{members[-1]['userId']}", headers=ownerHeaders).status_code == 204
    assert client.get(f"/households/{householdId}", headers=ownerHeaders).json()["isLocked"] is False
    assert client.post(f"/households/{householdId}/foods", json={"name": "Mléko", "baseUnit": "milliliter"}, headers=ownerHeaders).status_code == 201


def test_renewedPremiumUnlocksTheHousehold(client: TestClient) -> None:
    household, ownerHeaders, memberHeaders = lockedHousehold(client)
    makePremium("owner@example.com")

    assert client.post(f"/households/{household['id']}/foods", json={"name": "Sýr", "baseUnit": "gram"}, headers=memberHeaders).status_code == 201


def test_receiptItemsCanBeExported(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    saveReceipt(client, headers, householdId, "Albert", "2026-11-03", [("Mléko", "dairy", 30), ("Sleva", "other", -5)])

    rows = client.get(f"/households/{householdId}/exports/receipt-items", headers=headers).json()
    assert [(row["purchasedOn"], row["storeName"], row["name"], row["price"]) for row in rows] == [
        ("2026-11-03", "Albert", "Mléko", 30),
        ("2026-11-03", "Albert", "Sleva", -5),
    ]


def householdDetails(client: TestClient, headers: dict[str, str], householdId: int) -> dict:
    return client.get(f"/households/{householdId}", headers=headers).json()


def test_householdOverTheMemberLimitStaysUsableForADayAfterPremiumEnds(client: TestClient) -> None:
    household, ownerHeaders, memberHeaders = lockedHousehold(client)
    makePremium("owner@example.com", days=0)
    with getSessionFactory()() as session:
        owner = session.query(User).filter_by(email="owner@example.com").one()
        owner.premiumUntil = owner.premiumUntil - timedelta(hours=2)
        session.commit()

    details = householdDetails(client, memberHeaders, household["id"])
    assert details["isLocked"] is False
    assert details["locksAt"] is not None
    created = client.post(f"/households/{household['id']}/foods", json={"name": "Sýr", "baseUnit": "gram"}, headers=memberHeaders)
    assert created.status_code == 201
    joining = registerAndAuthorize(client, "late@example.com", "Late")
    assert requestToJoin(client, joining, household["inviteCode"]).status_code == 202


def test_extraOwnedHouseholdsLockADayAfterPremiumEnds(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    makePremium("anna@example.com")
    makePremium("petr@example.com")
    first = createHousehold(client, annaHeaders, "Doma")
    second = createHousehold(client, annaHeaders, "Chata")
    petrHousehold = createHousehold(client, petrHeaders, "U Petra")
    joinHousehold(client, annaHeaders, petrHousehold["inviteCode"])
    joinHousehold(client, petrHeaders, second["inviteCode"])

    makePremium("anna@example.com", days=-0.5)
    assert householdDetails(client, petrHeaders, second["id"])["locksAt"] is not None
    assert householdDetails(client, petrHeaders, second["id"])["isLocked"] is False

    makePremium("anna@example.com", days=-2)
    assert householdDetails(client, annaHeaders, first["id"])["isLocked"] is False
    assert householdDetails(client, petrHeaders, second["id"])["isLocked"] is True
    assert householdDetails(client, annaHeaders, petrHousehold["id"])["isLocked"] is False
    food = {"name": "Mléko", "baseUnit": "milliliter"}
    assert client.post(f"/households/{second['id']}/foods", json=food, headers=petrHeaders).status_code == 403
    assert client.post(f"/households/{first['id']}/foods", json=food, headers=annaHeaders).status_code == 201
    assert client.post(f"/households/{petrHousehold['id']}/foods", json=food, headers=annaHeaders).status_code == 201

    makePremium("anna@example.com")
    assert householdDetails(client, petrHeaders, second["id"])["isLocked"] is False
