from datetime import datetime, timedelta, timezone

import jwt
from fastapi.testclient import TestClient
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.models import RefreshToken, User
from tests.helpers import authorizationHeader, defaultEmail, defaultPassword, registerUser


def test_healthEndpointReportsOk(client: TestClient) -> None:
    assert client.get("/health").json() == {"status": "ok"}


def test_registerCreatesUserAndReturnsTokens(client: TestClient) -> None:
    response = registerUser(client, email="Anna@Example.com")

    assert response.status_code == 201
    body = response.json()
    assert body["tokenType"] == "bearer"
    assert body["accessTokenExpiresInSeconds"] == 1800
    me = client.get("/auth/me", headers=authorizationHeader(body["accessToken"]))
    assert me.json()["email"] == "anna@example.com"
    assert me.json()["displayName"] == "Anna"


def test_registerStoresOnlyPasswordHash(client: TestClient, databaseSession: Session) -> None:
    registerUser(client)

    user = databaseSession.scalar(select(User))
    assert user.passwordHash != defaultPassword
    assert user.passwordHash.startswith("$argon2")


def test_registerRejectsDuplicateEmailIgnoringCase(client: TestClient) -> None:
    registerUser(client)

    response = registerUser(client, email="ANNA@example.com")

    assert response.status_code == 409


def test_registerRejectsShortPasswordAndInvalidEmail(client: TestClient) -> None:
    assert registerUser(client, password="short").status_code == 422
    assert registerUser(client, email="not-an-email").status_code == 422


def test_loginSetsRefreshTokenOnlyInAProtectedCookie(client: TestClient) -> None:
    registerUser(client)
    client.cookies.clear()

    response = client.post("/auth/login", json={"email": defaultEmail, "password": defaultPassword})

    assert response.status_code == 200
    assert "refreshToken" not in response.json()
    cookieHeader = response.headers["set-cookie"]
    assert cookieHeader.startswith("refreshToken=")
    for attribute in ("HttpOnly", "Secure", "SameSite=strict"):
        assert attribute in cookieHeader
    assert client.cookies.get("refreshToken")


def test_loginFailuresUseTheSameMessage(client: TestClient) -> None:
    registerUser(client)

    wrongPassword = client.post("/auth/login", json={"email": defaultEmail, "password": "wrong password"})
    unknownEmail = client.post("/auth/login", json={"email": "nobody@example.com", "password": "wrong password"})

    assert wrongPassword.status_code == unknownEmail.status_code == 401
    assert wrongPassword.json() == unknownEmail.json()


def test_meRequiresValidAccessToken(client: TestClient) -> None:
    assert client.get("/auth/me").status_code == 401
    assert client.get("/auth/me", headers=authorizationHeader("garbage")).status_code == 401


def test_meRejectsExpiredAccessToken(client: TestClient) -> None:
    registerUser(client)
    expiredToken = jwt.encode(
        {"sub": "1", "exp": datetime.now(timezone.utc) - timedelta(minutes=1)},
        getConfiguration().jsonWebTokenSecret,
        algorithm="HS256",
    )

    assert client.get("/auth/me", headers=authorizationHeader(expiredToken)).status_code == 401


def useRefreshToken(client: TestClient, refreshToken: str):
    client.cookies.set("refreshToken", refreshToken, domain="testserver.local")
    return client.post("/auth/refresh")


def test_refreshReturnsNewTokensAndInvalidatesTheOldRefreshToken(client: TestClient) -> None:
    registerUser(client)
    firstRefreshToken = client.cookies.get("refreshToken")

    refreshed = client.post("/auth/refresh")

    assert refreshed.status_code == 200
    newRefreshToken = client.cookies.get("refreshToken")
    assert newRefreshToken != firstRefreshToken
    assert client.get("/auth/me", headers=authorizationHeader(refreshed.json()["accessToken"])).status_code == 200
    assert useRefreshToken(client, firstRefreshToken).status_code == 401


def test_reusingARotatedRefreshTokenRevokesTheWholeSession(client: TestClient) -> None:
    registerUser(client)
    firstRefreshToken = client.cookies.get("refreshToken")
    client.post("/auth/refresh")
    newRefreshToken = client.cookies.get("refreshToken")

    useRefreshToken(client, firstRefreshToken)

    assert useRefreshToken(client, newRefreshToken).status_code == 401


def test_refreshRejectsMissingUnknownAndExpiredTokens(client: TestClient, databaseSession: Session) -> None:
    registerUser(client)
    refreshToken = client.cookies.get("refreshToken")
    client.cookies.clear()
    assert client.post("/auth/refresh").status_code == 401
    assert useRefreshToken(client, "unknown").status_code == 401

    databaseSession.execute(
        update(RefreshToken).values(expiresAt=datetime.now(timezone.utc) - timedelta(days=1))
    )
    databaseSession.commit()

    assert useRefreshToken(client, refreshToken).status_code == 401


def test_logoutRevokesTheRefreshTokenAndClearsTheCookie(client: TestClient) -> None:
    registerUser(client)
    refreshToken = client.cookies.get("refreshToken")

    response = client.post("/auth/logout")

    assert response.status_code == 204
    assert client.cookies.get("refreshToken") is None
    assert useRefreshToken(client, refreshToken).status_code == 401
    client.cookies.clear()
    assert client.post("/auth/logout").status_code == 204
