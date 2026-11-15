from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from application.main import application
from application.models import InviteLink
from application.notifications.push import getPushSender
from tests.helpers import createHousehold, registerAndAuthorize, requestToJoin
from tests.test_notifications import FakeSender, subscribe


def members(client: TestClient, headers: dict[str, str], householdId: int) -> list[str]:
    response = client.get(f"/households/{householdId}/members", headers=headers)
    return [member["displayName"] for member in response.json()]


def test_ownerApprovesOrRejectsRequestsMadeWithTheCode(client: TestClient) -> None:
    sender = FakeSender()
    application.dependency_overrides[getPushSender] = lambda: sender
    try:
        anna = registerAndAuthorize(client, "anna@example.com", "Anna")
        petr = registerAndAuthorize(client, "petr.novak@example.com", "Petr")
        jana = registerAndAuthorize(client, "jana@example.com", "Jana")
        household = createHousehold(client, anna)
        subscribe(client, anna, "https://push.example/anna")

        petrRequest = requestToJoin(client, petr, household["inviteCode"]).json()
        janaRequest = requestToJoin(client, jana, household["inviteCode"]).json()

        assert sender.sent[0] == ("https://push.example/anna", {"type": "joinRequest", "name": "Petr"})
        pending = client.get(f"/households/{household['id']}/join-requests", headers=anna).json()
        assert [(item["displayName"], item["maskedEmail"]) for item in pending] == [
            ("Petr", "pe•••@example.com"),
            ("Jana", "ja•••@example.com"),
        ]
        assert client.get("/join-requests/mine", headers=petr).json()["householdName"] == "Home"
        assert client.post(f"/join-requests/{petrRequest['id']}/approve", headers=petr).status_code == 404

        assert client.post(f"/join-requests/{petrRequest['id']}/approve", headers=anna).status_code == 204
        assert client.post(f"/join-requests/{janaRequest['id']}/approve", headers=petr).status_code == 404
        assert client.post(f"/join-requests/{janaRequest['id']}/reject", headers=petr).status_code == 404
        assert client.post(f"/join-requests/{janaRequest['id']}/reject", headers=anna).status_code == 204

        assert members(client, anna, household["id"]) == ["Anna", "Petr"]
        assert client.get("/join-requests/mine", headers=petr).json() is None
        assert client.get("/join-requests/mine", headers=jana).json()["isRejected"] is True
        assert client.get(f"/households/{household['id']}/join-requests", headers=anna).json() == []
        assert client.get(f"/households/{household['id']}/join-requests", headers=petr).status_code == 403
        assert client.post(f"/join-requests/{janaRequest['id']}/approve", headers=anna).status_code == 404
    finally:
        application.dependency_overrides.pop(getPushSender, None)


def test_requesterCanCancelOrRequestAnotherHousehold(client: TestClient) -> None:
    anna = registerAndAuthorize(client, "anna@example.com", "Anna")
    eva = registerAndAuthorize(client, "eva@example.com", "Eva")
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")
    annaHousehold = createHousehold(client, anna, "Annin byt")
    evaHousehold = createHousehold(client, eva, "Evin dům")

    requestToJoin(client, petr, annaHousehold["inviteCode"])
    moved = requestToJoin(client, petr, evaHousehold["inviteCode"]).json()

    assert moved["householdName"] == "Evin dům"
    assert client.get(f"/households/{annaHousehold['id']}/join-requests", headers=anna).json() == []
    assert client.delete("/join-requests/mine", headers=petr).status_code == 204
    assert client.get("/join-requests/mine", headers=petr).json() is None
    assert client.get(f"/households/{evaHousehold['id']}/join-requests", headers=eva).json() == []
    assert requestToJoin(client, anna, evaHousehold["inviteCode"]).status_code == 409


def test_inviteLinkJoinsOnePersonWithoutApproval(client: TestClient, databaseSession: Session) -> None:
    anna = registerAndAuthorize(client, "anna@example.com", "Anna")
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")
    jana = registerAndAuthorize(client, "jana@example.com", "Jana")
    household = createHousehold(client, anna)
    linksUrl = f"/households/{household['id']}/invite-links"

    created = client.post(linksUrl, headers=anna)
    assert created.status_code == 201
    token = created.json()["token"]
    assert [link["id"] for link in client.get(linksUrl, headers=anna).json()] == [created.json()["id"]]

    requestToJoin(client, petr, household["inviteCode"])
    joined = client.post("/households/join-by-link", json={"token": token}, headers=petr)
    assert joined.status_code == 200
    assert (joined.json()["id"], joined.json()["role"]) == (household["id"], "member")
    assert client.get("/join-requests/mine", headers=petr).json() is None
    assert client.post("/households/join-by-link", json={"token": token}, headers=jana).status_code == 410
    assert client.get(linksUrl, headers=anna).json() == []
    assert client.post(linksUrl, headers=petr).status_code == 403

    revoked = client.post(linksUrl, headers=anna).json()
    assert client.delete(f"/invite-links/{revoked['id']}", headers=petr).status_code == 404
    assert client.delete(f"/invite-links/{revoked['id']}", headers=anna).status_code == 204
    assert client.post("/households/join-by-link", json={"token": revoked["token"]}, headers=jana).status_code == 410

    expired = client.post(linksUrl, headers=anna).json()
    databaseSession.execute(
        update(InviteLink)
        .where(InviteLink.id == expired["id"])
        .values(expiresAt=datetime.now(timezone.utc) - timedelta(minutes=1))
    )
    databaseSession.commit()
    assert client.post("/households/join-by-link", json={"token": expired["token"]}, headers=jana).status_code == 410
    assert client.post("/households/join-by-link", json={"token": "made-up"}, headers=jana).status_code == 410
    assert members(client, anna, household["id"]) == ["Anna", "Petr"]


def test_memberOfAnotherHouseholdCannotUseALink(client: TestClient) -> None:
    anna = registerAndAuthorize(client, "anna@example.com", "Anna")
    eva = registerAndAuthorize(client, "eva@example.com", "Eva")
    household = createHousehold(client, anna)
    createHousehold(client, eva)
    token = client.post(f"/households/{household['id']}/invite-links", headers=anna).json()["token"]

    assert client.post("/households/join-by-link", json={"token": token}, headers=eva).status_code == 409
    assert client.get(f"/households/{household['id']}/invite-links", headers=anna).json() != []
