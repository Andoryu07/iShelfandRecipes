from fastapi.testclient import TestClient

from application.database import getSessionFactory
from application.models import JoinRequest, User
from application.routers.joining import joinAsMember

defaultEmail = "anna@example.com"
defaultPassword = "correct horse battery"


def registerUser(
    client: TestClient, email: str = defaultEmail, password: str = defaultPassword, displayName: str = "Anna"
):
    return client.post("/auth/register", json={"email": email, "password": password, "displayName": displayName})


def authorizationHeader(accessToken: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {accessToken}"}


def registerAndAuthorize(client: TestClient, email: str, displayName: str) -> dict[str, str]:
    response = registerUser(client, email=email, displayName=displayName)
    return authorizationHeader(response.json()["accessToken"])


def createHousehold(client: TestClient, headers: dict[str, str], name: str = "Home") -> dict:
    response = client.post("/households", json={"name": name}, headers=headers)
    assert response.status_code == 201
    return response.json()


def requestToJoin(client: TestClient, headers: dict[str, str], inviteCode: str):
    return client.post("/households/join", json={"inviteCode": inviteCode}, headers=headers)


def joinHousehold(client: TestClient, headers: dict[str, str], inviteCode: str):
    response = requestToJoin(client, headers, inviteCode)
    if response.status_code != 202:
        return response
    with getSessionFactory()() as session:
        joinRequest = session.get(JoinRequest, response.json()["id"])
        joinAsMember(session, session.get(User, joinRequest.userId), joinRequest.householdId)
        session.commit()
    return response
