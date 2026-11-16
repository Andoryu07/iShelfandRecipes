from collections.abc import Iterator
from datetime import timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.main import application
from application.models import ReceiptScan
from application.plans import startOfCurrentMonth
from application.receipts.dependencies import getReceiptReader
from application.receipts.reading import ReceiptReadingError
from tests.helpers import createHousehold, joinHousehold, makePremium, registerAndAuthorize
from tests.test_receipt_scanning import FakeReceiptReader, ScanningHousehold


@pytest.fixture
def testActivation(monkeypatch: pytest.MonkeyPatch) -> Iterator[None]:
    monkeypatch.setenv("PREMIUM_TEST_ACTIVATION", "true")
    getConfiguration.cache_clear()
    yield
    monkeypatch.delenv("PREMIUM_TEST_ACTIVATION")
    getConfiguration.cache_clear()


@pytest.fixture
def receiptReader() -> Iterator[FakeReceiptReader]:
    reader = FakeReceiptReader()
    application.dependency_overrides[getReceiptReader] = lambda: reader
    yield reader
    application.dependency_overrides.pop(getReceiptReader, None)


def test_newUserHasTheFreePlan(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")

    assert client.get("/auth/me/plan", headers=headers).json() == {
        "plan": "free",
        "premiumUntil": None,
        "testActivationAvailable": False,
        "receiptScans": {"used": 0, "limit": 10, "period": "month"},
        "recipeScans": {"used": 0, "limit": 3, "period": "total"},
        "householdCount": 0,
        "householdLimit": 1,
        "householdMemberLimit": 6,
        "storageLocationLimit": 3,
        "spendingMonths": 6,
        "canShareHousehold": True,
        "canUploadFoodPhotos": True,
        "showsAds": True,
        "rewardedAdsLeftToday": 3,
    }
    assert client.post("/auth/me/premium/test-activation", headers=headers).status_code == 404


def test_testActivationTurnsPremiumOnAndOff(client: TestClient, testActivation: None) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")

    activated = client.post("/auth/me/premium/test-activation", headers=headers).json()
    assert (activated["plan"], activated["receiptScans"]["limit"], activated["householdMemberLimit"]) == ("premium", 60, 12)
    assert activated["recipeScans"] == {"used": 0, "limit": 20, "period": "month"}
    assert activated["spendingMonths"] is None
    assert activated["premiumUntil"] is not None
    cancelled = client.delete("/auth/me/premium/test-activation", headers=headers).json()
    assert (cancelled["plan"], cancelled["premiumUntil"]) == ("free", None)


def test_expiredPremiumIsFree(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    makePremium("anna@example.com", days=-1)

    assert client.get("/auth/me/plan", headers=headers).json()["plan"] == "free"


def test_receiptScansAreLimitedPerMonth(
    client: TestClient, receiptReader: FakeReceiptReader, databaseSession: Session
) -> None:
    household = ScanningHousehold(client)
    receiptReader.error = ReceiptReadingError("timeout")
    assert household.scan().status_code == 502
    receiptReader.error = None
    userId = client.get("/auth/me", headers=household.headers).json()["id"]
    databaseSession.add(
        ReceiptScan(householdId=household.id, userId=userId, createdAt=startOfCurrentMonth() - timedelta(minutes=1))
    )
    databaseSession.commit()

    assert [household.scan().status_code for _ in range(11)] == [200] * 10 + [429]
    assert len(receiptReader.calls) == 11
    plan = client.get("/auth/me/plan", headers=household.headers).json()
    assert plan["receiptScans"] == {"used": 10, "limit": 10, "period": "month"}

    makePremium("anna@example.com")
    assert household.scan().status_code == 200


def test_membersOfAFreeHouseholdAreLimited(client: TestClient) -> None:
    ownerHeaders = registerAndAuthorize(client, "owner@example.com", "Owner")
    inviteCode = createHousehold(client, ownerHeaders)["inviteCode"]
    for index in range(5):
        joinHousehold(client, registerAndAuthorize(client, f"member{index}@example.com", "Member"), inviteCode)

    lateHeaders = registerAndAuthorize(client, "late@example.com", "Late")
    request = client.post("/households/join", json={"inviteCode": inviteCode}, headers=lateHeaders).json()
    approval = client.post(f"/join-requests/{request['id']}/approve", headers=ownerHeaders)
    assert approval.status_code == 409

    makePremium("owner@example.com")
    assert client.post(f"/join-requests/{request['id']}/approve", headers=ownerHeaders).status_code == 204


def test_rewardedAdsAddScansAtMostThreeTimesADay(client: TestClient, receiptReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    headers = household.headers

    first = client.post("/auth/me/rewarded-ads", json={"kind": "receiptScan"}, headers=headers).json()
    assert (first["receiptScans"]["limit"], first["rewardedAdsLeftToday"]) == (11, 2)
    second = client.post("/auth/me/rewarded-ads", json={"kind": "recipeScan"}, headers=headers).json()
    assert (second["recipeScans"]["limit"], second["receiptScans"]["limit"]) == (4, 11)
    client.post("/auth/me/rewarded-ads", json={"kind": "receiptScan"}, headers=headers)
    assert client.post("/auth/me/rewarded-ads", json={"kind": "receiptScan"}, headers=headers).status_code == 429
    assert [household.scan().status_code for _ in range(13)] == [200] * 12 + [429]


def test_premiumUsersAndDisabledAdsHaveNoRewardedAds(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    makePremium("anna@example.com")
    plan = client.get("/auth/me/plan", headers=headers).json()
    assert (plan["showsAds"], plan["rewardedAdsLeftToday"]) == (False, 0)
    assert client.post("/auth/me/rewarded-ads", json={"kind": "receiptScan"}, headers=headers).status_code == 429

    makePremium("anna@example.com", days=-1)
    monkeypatch.setenv("ADS_ENABLED", "false")
    getConfiguration.cache_clear()
    try:
        plan = client.get("/auth/me/plan", headers=headers).json()
        assert (plan["showsAds"], plan["rewardedAdsLeftToday"]) == (False, 0)
    finally:
        monkeypatch.delenv("ADS_ENABLED")
        getConfiguration.cache_clear()
