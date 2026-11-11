from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import Food, Household, Reservation, StockItem, StorageLocation, User
from application.models.enumerations import MeasurementUnit, ReservationStatus
from tests.helpers import createHousehold, joinHousehold, registerAndAuthorize


def listMembers(client: TestClient, headers: dict[str, str], householdId: int) -> list[dict]:
    return client.get(f"/households/{householdId}/members", headers=headers).json()


def test_createHouseholdMakesCreatorOwnerWithDefaultStorageLocations(
    client: TestClient, databaseSession: Session
) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")

    household = createHousehold(client, annaHeaders, name="  Home  ")

    assert household["name"] == "Home"
    assert household["role"] == "owner"
    assert len(household["inviteCode"]) == 9 and household["inviteCode"][4] == "-"
    storageLocationKinds = databaseSession.scalars(
        select(StorageLocation.kind).where(StorageLocation.householdId == household["id"])
    ).all()
    assert sorted(kind.value for kind in storageLocationKinds) == ["freezer", "fridge", "pantry"]
    assert client.get("/households", headers=annaHeaders).json() == [household]


def test_createHouseholdRejectsBlankName(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")

    assert client.post("/households", json={"name": "   "}, headers=annaHeaders).status_code == 422


def test_householdEndpointsRequireAuthentication(client: TestClient) -> None:
    assert client.get("/households").status_code == 401
    assert client.post("/households", json={"name": "Home"}).status_code == 401


def test_secondUserJoinsWithInviteCodeIgnoringCaseAndHyphen(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, annaHeaders)

    response = joinHousehold(client, petrHeaders, household["inviteCode"].replace("-", " ").lower())

    assert response.status_code == 200
    assert response.json()["role"] == "member"
    members = listMembers(client, annaHeaders, household["id"])
    assert [(member["displayName"], member["role"]) for member in members] == [
        ("Anna", "owner"),
        ("Petr", "member"),
    ]
    assert "email" not in members[0]


def test_joinRejectsUnknownCode(client: TestClient) -> None:
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")

    assert joinHousehold(client, petrHeaders, "AAAA-AAAA").status_code == 404


def test_userCannotBelongToTwoHouseholds(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    annaHousehold = createHousehold(client, annaHeaders)
    createHousehold(client, petrHeaders)

    assert joinHousehold(client, petrHeaders, annaHousehold["inviteCode"]).status_code == 409
    assert client.post("/households", json={"name": "Second"}, headers=annaHeaders).status_code == 409
    assert joinHousehold(client, annaHeaders, annaHousehold["inviteCode"]).status_code == 409


def test_newInviteCodeInvalidatesTheOldOne(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, annaHeaders)

    response = client.post(f"/households/{household['id']}/invite-code", headers=annaHeaders)

    assert response.status_code == 200
    assert response.json()["inviteCode"] != household["inviteCode"]
    assert joinHousehold(client, petrHeaders, household["inviteCode"]).status_code == 404
    assert joinHousehold(client, petrHeaders, response.json()["inviteCode"]).status_code == 200


def test_nonMemberGetsNotFound(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    household = createHousehold(client, annaHeaders)
    householdId = household["id"]

    assert client.get(f"/households/{householdId}", headers=strangerHeaders).status_code == 404
    assert client.get(f"/households/{householdId}/members", headers=strangerHeaders).status_code == 404
    assert client.patch(
        f"/households/{householdId}", json={"name": "Mine"}, headers=strangerHeaders
    ).status_code == 404
    assert client.get("/households/999999", headers=annaHeaders).status_code == 404


def test_onlyOwnerCanRenameRegenerateCodeAndRemoveOthers(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, annaHeaders)
    householdId = household["id"]
    joinHousehold(client, petrHeaders, household["inviteCode"])
    annaUserId = listMembers(client, annaHeaders, householdId)[0]["userId"]

    assert client.patch(f"/households/{householdId}", json={"name": "Ours"}, headers=petrHeaders).status_code == 403
    assert client.post(f"/households/{householdId}/invite-code", headers=petrHeaders).status_code == 403
    assert client.delete(f"/households/{householdId}/members/{annaUserId}", headers=petrHeaders).status_code == 403

    renamed = client.patch(f"/households/{householdId}", json={"name": "Ours"}, headers=annaHeaders)
    assert renamed.status_code == 200
    assert renamed.json()["name"] == "Ours"
    assert client.get(f"/households/{householdId}", headers=petrHeaders).json()["name"] == "Ours"


def test_ownerRemovesMemberAndTheirActiveReservationsAreCancelled(
    client: TestClient, databaseSession: Session
) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, annaHeaders)
    householdId = household["id"]
    joinHousehold(client, petrHeaders, household["inviteCode"])
    petrUserId = listMembers(client, annaHeaders, householdId)[1]["userId"]
    storageLocationId = databaseSession.scalar(
        select(StorageLocation.id).where(StorageLocation.householdId == householdId)
    )
    food = Food(householdId=householdId, name="Milk", baseUnit=MeasurementUnit.milliliter)
    databaseSession.add(food)
    databaseSession.flush()
    stockItem = StockItem(storageLocationId=storageLocationId, foodId=food.id, quantity=Decimal(1000))
    databaseSession.add(stockItem)
    databaseSession.flush()
    databaseSession.add(Reservation(stockItemId=stockItem.id, userId=petrUserId, quantity=Decimal(250)))
    databaseSession.commit()

    response = client.delete(f"/households/{householdId}/members/{petrUserId}", headers=annaHeaders)

    assert response.status_code == 204
    assert [member["displayName"] for member in listMembers(client, annaHeaders, householdId)] == ["Anna"]
    assert client.get(f"/households/{householdId}", headers=petrHeaders).status_code == 404
    databaseSession.expire_all()
    assert databaseSession.scalar(select(Reservation.status)) == ReservationStatus.cancelled


def test_leavingOwnerPassesOwnershipToLongestStandingMember(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    janaHeaders = registerAndAuthorize(client, "jana@example.com", "Jana")
    household = createHousehold(client, annaHeaders)
    householdId = household["id"]
    joinHousehold(client, petrHeaders, household["inviteCode"])
    joinHousehold(client, janaHeaders, household["inviteCode"])
    annaUserId = listMembers(client, annaHeaders, householdId)[0]["userId"]

    response = client.delete(f"/households/{householdId}/members/{annaUserId}", headers=annaHeaders)

    assert response.status_code == 204
    members = listMembers(client, petrHeaders, householdId)
    assert [(member["displayName"], member["role"]) for member in members] == [
        ("Petr", "owner"),
        ("Jana", "member"),
    ]


def test_memberCanLeaveAndJoinAnotherHousehold(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, annaHeaders)
    joinHousehold(client, petrHeaders, household["inviteCode"])
    petrUserId = listMembers(client, annaHeaders, household["id"])[1]["userId"]

    assert client.delete(
        f"/households/{household['id']}/members/{petrUserId}", headers=petrHeaders
    ).status_code == 204
    assert client.get("/households", headers=petrHeaders).json() == []
    assert client.post("/households", json={"name": "Petr's flat"}, headers=petrHeaders).status_code == 201


def test_householdIsDeletedWhenLastMemberLeaves(client: TestClient, databaseSession: Session) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, annaHeaders)
    annaUserId = listMembers(client, annaHeaders, household["id"])[0]["userId"]

    response = client.delete(f"/households/{household['id']}/members/{annaUserId}", headers=annaHeaders)

    assert response.status_code == 204
    assert databaseSession.scalar(select(func.count()).select_from(Household)) == 0
    assert databaseSession.scalar(select(func.count()).select_from(StorageLocation)) == 0
    assert databaseSession.scalar(select(func.count()).select_from(User)) == 1


def test_removingSomeoneOutsideTheHouseholdReturnsNotFound(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, annaHeaders)

    assert client.delete(f"/households/{household['id']}/members/999999", headers=annaHeaders).status_code == 404
