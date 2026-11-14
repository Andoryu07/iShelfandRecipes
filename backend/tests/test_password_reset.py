import re
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from application.emails.sending import Email
from application.models import PasswordResetToken
from tests.helpers import authorizationHeader, defaultEmail, defaultPassword, registerUser

newPassword = "brand new password"


def requestReset(client: TestClient, email: str = defaultEmail):
    return client.post("/auth/password-reset/request", json={"email": email})


def tokenFrom(email: Email) -> str:
    match = re.search(r"/reset-password#token=([\w-]+)", email.text)
    assert match is not None
    return match.group(1)


def logIn(client: TestClient, password: str):
    return client.post("/auth/login", json={"email": defaultEmail, "password": password})


def test_resetLinkSetsNewPasswordOnceAndSignsOutEverywhere(client: TestClient, sentEmails: list[Email]) -> None:
    registerUser(client)
    oldRefreshCookie = client.cookies.get("refreshToken")

    response = requestReset(client, "ANNA@example.com")

    assert response.status_code == 202
    assert [email.recipient for email in sentEmails] == [defaultEmail]
    token = tokenFrom(sentEmails[0])

    confirmed = client.post("/auth/password-reset/confirm", json={"token": token, "newPassword": newPassword})
    assert confirmed.status_code == 204
    assert sentEmails[-1].subject == "Heslo do iShelf bylo změněno"
    assert logIn(client, defaultPassword).status_code == 401
    assert logIn(client, newPassword).status_code == 200

    client.cookies.clear()
    client.cookies.set("refreshToken", oldRefreshCookie)
    assert client.post("/auth/refresh").status_code == 401
    again = client.post("/auth/password-reset/confirm", json={"token": token, "newPassword": "another password"})
    assert again.status_code == 400


def test_unknownEmailLooksTheSameAndSendsNothing(client: TestClient, sentEmails: list[Email]) -> None:
    registerUser(client)

    response = requestReset(client, "nobody@example.com")

    assert response.status_code == 202
    assert sentEmails == []


def test_expiredOrWrongTokenIsRejected(client: TestClient, sentEmails: list[Email], databaseSession: Session) -> None:
    registerUser(client)
    requestReset(client)
    token = tokenFrom(sentEmails[0])
    databaseSession.execute(
        update(PasswordResetToken).values(expiresAt=datetime.now(timezone.utc) - timedelta(minutes=1))
    )
    databaseSession.commit()

    for candidate in [token, "made-up-token"]:
        response = client.post("/auth/password-reset/confirm", json={"token": candidate, "newPassword": newPassword})
        assert response.status_code == 400
    assert logIn(client, defaultPassword).status_code == 200


def test_newResetPasswordMustBeLongEnough(client: TestClient, sentEmails: list[Email]) -> None:
    registerUser(client)
    requestReset(client)

    response = client.post("/auth/password-reset/confirm", json={"token": tokenFrom(sentEmails[0]), "newPassword": "short"})

    assert response.status_code == 422


def test_usingOneLinkCancelsTheOtherLinks(client: TestClient, sentEmails: list[Email]) -> None:
    registerUser(client)
    requestReset(client)
    requestReset(client)
    firstToken, secondToken = tokenFrom(sentEmails[0]), tokenFrom(sentEmails[1])

    assert client.post("/auth/password-reset/confirm", json={"token": secondToken, "newPassword": newPassword}).status_code == 204
    assert client.post("/auth/password-reset/confirm", json={"token": firstToken, "newPassword": "x" * 10}).status_code == 400


def test_atMostThreeResetEmailsPerHour(client: TestClient, sentEmails: list[Email]) -> None:
    registerUser(client)

    responses = [requestReset(client) for _ in range(5)]

    assert [response.status_code for response in responses] == [202] * 5
    assert len(sentEmails) == 3


def test_changePasswordNeedsCurrentPasswordAndKeepsThisDeviceSignedIn(
    client: TestClient, sentEmails: list[Email]
) -> None:
    headers = authorizationHeader(registerUser(client).json()["accessToken"])
    oldRefreshCookie = client.cookies.get("refreshToken")

    wrong = client.post(
        "/auth/me/password", json={"currentPassword": "wrong password", "newPassword": newPassword}, headers=headers
    )
    assert wrong.status_code == 403
    assert sentEmails == []

    changed = client.post(
        "/auth/me/password", json={"currentPassword": defaultPassword, "newPassword": newPassword}, headers=headers
    )
    assert changed.status_code == 200
    newRefreshCookie = client.cookies.get("refreshToken")
    assert newRefreshCookie and newRefreshCookie != oldRefreshCookie
    assert [email.subject for email in sentEmails] == ["Heslo do iShelf bylo změněno"]
    assert logIn(client, newPassword).status_code == 200

    client.cookies.clear()
    client.cookies.set("refreshToken", oldRefreshCookie)
    assert client.post("/auth/refresh").status_code == 401


def test_accountDeletionSendsANotice(client: TestClient, sentEmails: list[Email]) -> None:
    headers = authorizationHeader(registerUser(client).json()["accessToken"])

    response = client.request("DELETE", "/auth/me", json={"password": defaultPassword}, headers=headers)

    assert response.status_code == 204
    assert [email.subject for email in sentEmails] == ["Tvůj účet v iShelf bude smazán"]
    deletionDate = (datetime.now(timezone.utc) + timedelta(days=14)).astimezone()
    assert f"{deletionDate.month}. {deletionDate.year}" in sentEmails[0].text
