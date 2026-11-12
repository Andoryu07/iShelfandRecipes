import base64
from datetime import date, datetime, timedelta
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from py_vapid import Vapid02
from pywebpush import WebPushException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.jobs.worker import nextRunAfter
from application.models import Household, PushSubscription
from application.notifications.expiration import sendExpirationNotifications
from application.notifications.generate_vapid_keys import encode
from application.notifications.push import WebPushSender
from application.stock import householdTimeZone
from tests.helpers import createHousehold, joinHousehold, registerAndAuthorize
from tests.test_foods import createFood

today = date(2026, 11, 20)


class FakeSender:
    def __init__(self) -> None:
        self.sent: list[tuple[str, dict]] = []
        self.expiredEndpoints: set[str] = set()

    def send(self, subscription: PushSubscription, payload: dict) -> bool:
        if subscription.endpoint in self.expiredEndpoints:
            return False
        self.sent.append((subscription.endpoint, payload))
        return True


def subscribe(client: TestClient, headers: dict[str, str], endpoint: str):
    return client.post(
        "/push-subscriptions",
        json={"endpoint": endpoint, "keys": {"p256dh": "public-key", "auth": "secret"}},
        headers=headers,
    )


@pytest.fixture
def vapidKeys(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("VAPID_PUBLIC_KEY", "test-public-key")
    monkeypatch.setenv("VAPID_PRIVATE_KEY", "test-private-key")
    getConfiguration.cache_clear()
    yield
    getConfiguration.cache_clear()


def test_publicKeyNeedsConfiguration(client: TestClient, vapidKeys: None) -> None:
    assert client.get("/push/public-key").json() == {"publicKey": "test-public-key"}


def test_publicKeyIsUnavailableWithoutConfiguration(client: TestClient) -> None:
    assert client.get("/push/public-key").status_code == 503


def test_subscriptionIsStoredOncePerEndpointAndDeletedOnlyByItsOwner(client: TestClient, databaseSession: Session) -> None:
    anna = registerAndAuthorize(client, "anna@example.com", "Anna")
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")

    assert subscribe(client, anna, "https://push.example/1").status_code == 204
    assert subscribe(client, petr, "https://push.example/1").status_code == 204
    assert databaseSession.scalar(select(func.count()).select_from(PushSubscription)) == 1

    client.request("DELETE", "/push-subscriptions", json={"endpoint": "https://push.example/1"}, headers=anna)
    assert databaseSession.scalar(select(func.count()).select_from(PushSubscription)) == 1
    client.request("DELETE", "/push-subscriptions", json={"endpoint": "https://push.example/1"}, headers=petr)
    assert databaseSession.scalar(select(func.count()).select_from(PushSubscription)) == 0
    assert client.post("/push-subscriptions", json={"endpoint": "x"}).status_code == 401


def prepareHousehold(client: TestClient) -> dict:
    anna = registerAndAuthorize(client, "anna@example.com", "Anna")
    petr = registerAndAuthorize(client, "petr@example.com", "Petr")
    household = createHousehold(client, anna)
    joinHousehold(client, petr, household["inviteCode"])
    fridgeId = client.get(f"/households/{household['id']}/storage-locations", headers=anna).json()[0]["id"]
    for name, days in [("Mléko", 0), ("Jogurt", 1), ("Šunka", 2), ("Sýr", 3), ("Smetana", -1), ("Rýže", None)]:
        foodId = createFood(client, anna, household["id"], name).json()["id"]
        client.post(
            f"/households/{household['id']}/stock-items",
            json={
                "foodId": foodId,
                "storageLocationId": fridgeId,
                "quantity": 100,
                "expirationDate": (today + timedelta(days=days)).isoformat() if days is not None else None,
            },
            headers=anna,
        )
    subscribe(client, anna, "https://push.example/anna")
    subscribe(client, petr, "https://push.example/petr")
    return household


def test_dailyJobSendsOneSummaryPerHouseholdAndDay(client: TestClient, databaseSession: Session) -> None:
    household = prepareHousehold(client)
    stranger = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    subscribe(client, stranger, "https://push.example/stranger")
    sender = FakeSender()

    assert sendExpirationNotifications(databaseSession, sender, today) == 1

    expectedPayload = {
        "type": "expiration",
        "count": 3,
        "items": [{"name": "Mléko", "daysLeft": 0}, {"name": "Jogurt", "daysLeft": 1}, {"name": "Šunka", "daysLeft": 2}],
    }
    assert sorted(sender.sent, key=lambda entry: entry[0]) == [
        ("https://push.example/anna", expectedPayload),
        ("https://push.example/petr", expectedPayload),
    ]
    databaseSession.expire_all()
    assert databaseSession.get(Household, household["id"]).expirationNotifiedOn == today

    assert sendExpirationNotifications(databaseSession, sender, today) == 0
    assert len(sender.sent) == 2
    assert sendExpirationNotifications(databaseSession, sender, today, force=True) == 1
    assert sendExpirationNotifications(databaseSession, sender, today + timedelta(days=1)) == 1
    assert len(sender.sent) == 6


def test_expiredSubscriptionsAreRemoved(client: TestClient, databaseSession: Session) -> None:
    prepareHousehold(client)
    sender = FakeSender()
    sender.expiredEndpoints = {"https://push.example/petr"}

    sendExpirationNotifications(databaseSession, sender, today)

    endpoints = databaseSession.scalars(select(PushSubscription.endpoint)).all()
    assert endpoints == ["https://push.example/anna"]


def test_householdWithoutExpiringFoodGetsNothing(client: TestClient, databaseSession: Session) -> None:
    prepareHousehold(client)
    sender = FakeSender()

    assert sendExpirationNotifications(databaseSession, sender, today + timedelta(days=30)) == 0
    assert sender.sent == []


def test_webPushSenderReportsGoneSubscriptions() -> None:
    subscription = PushSubscription(endpoint="https://push.example/1", publicKey="key", authenticationSecret="secret")
    gone = WebPushException("gone", response=type("Response", (), {"status_code": 410})())
    failing = WebPushException("server error", response=type("Response", (), {"status_code": 500})())

    with patch("application.notifications.push.webpush") as webpush:
        assert WebPushSender().send(subscription, {"type": "expiration"}) is True
        assert webpush.call_args.kwargs["subscription_info"]["keys"] == {"p256dh": "key", "auth": "secret"}
        webpush.side_effect = gone
        assert WebPushSender().send(subscription, {}) is False
        webpush.side_effect = failing
        assert WebPushSender().send(subscription, {}) is True


def test_generatedKeysBelongTogether(capsys: pytest.CaptureFixture[str]) -> None:
    from application.notifications.generate_vapid_keys import main

    main()
    lines = dict(line.split("=", 1) for line in capsys.readouterr().out.splitlines() if "=" in line)
    vapid = Vapid02.from_string(private_key=lines["VAPID_PRIVATE_KEY"])
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    publicRaw = vapid.public_key.public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)
    assert encode(publicRaw) == lines["VAPID_PUBLIC_KEY"]
    assert len(base64.urlsafe_b64decode(lines["VAPID_PUBLIC_KEY"] + "==")) == 65


def test_workerRunsEveryDayAtEight() -> None:
    morning = datetime(2026, 11, 20, 7, 30, tzinfo=householdTimeZone)
    evening = datetime(2026, 11, 20, 21, 0, tzinfo=householdTimeZone)

    assert nextRunAfter(morning) == datetime(2026, 11, 20, 8, 0, tzinfo=householdTimeZone)
    assert nextRunAfter(evening) == datetime(2026, 11, 21, 8, 0, tzinfo=householdTimeZone)


def test_generatedKeysSignAndEncryptARealPushRequest(capsys: pytest.CaptureFixture[str], monkeypatch: pytest.MonkeyPatch) -> None:
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    from application.notifications.generate_vapid_keys import main

    main()
    lines = dict(line.split("=", 1) for line in capsys.readouterr().out.splitlines() if "=" in line)
    monkeypatch.setenv("VAPID_PRIVATE_KEY", lines["VAPID_PRIVATE_KEY"])
    monkeypatch.setenv("VAPID_SUBJECT", "mailto:test@example.com")
    getConfiguration.cache_clear()
    browserKey = ec.generate_private_key(ec.SECP256R1())
    subscription = PushSubscription(
        endpoint="https://push.example/abc",
        publicKey=encode(browserKey.public_key().public_bytes(Encoding.X962, PublicFormat.UncompressedPoint)),
        authenticationSecret=encode(b"0123456789abcdef"),
    )
    captured = {}

    def fakePost(url, data=None, headers=None, timeout=None, **_):
        captured.update(url=url, data=data, headers=headers)
        return type("Response", (), {"status_code": 201, "text": "", "headers": {}, "content": b""})()

    try:
        with patch("requests.post", fakePost):
            assert WebPushSender().send(subscription, {"type": "expiration", "count": 1, "items": []}) is True
    finally:
        getConfiguration.cache_clear()

    assert captured["url"] == "https://push.example/abc"
    assert captured["headers"]["authorization"].startswith("vapid t=")
    assert captured["headers"]["content-encoding"] == "aes128gcm"
    assert len(captured["data"]) > 0
