from fastapi.testclient import TestClient

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
