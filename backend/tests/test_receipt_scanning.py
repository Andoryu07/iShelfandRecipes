from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from application.main import application
from application.receipts.dependencies import getReceiptReader
from application.receipts.reading import (
    ExtractedReceipt,
    ExtractedReceiptItem,
    ReceiptReadingError,
    ReceiptReadingResult,
)
from tests.helpers import createHousehold, registerAndAuthorize
from tests.test_foods import createFood

fakeImage = b"\xff\xd8\xff fake jpeg bytes"


def extractedItem(**fields) -> ExtractedReceiptItem:
    values = {
        "originalText": "MLEKO POLOTUC 1L",
        "name": "Mléko polotučné",
        "genericName": "Mléko",
        "category": "dairy",
        "isFood": True,
        "packageCount": 1,
        "quantityPerPackage": 1000,
        "unit": "milliliter",
        "price": 24.90,
        "discount": 0,
    }
    return ExtractedReceiptItem(**{**values, **fields})


class FakeReceiptReader:
    def __init__(self) -> None:
        self.receipt = ExtractedReceipt(storeName="Albert", purchasedOn="2026-11-10", totalAmount=24.90, items=[extractedItem()])
        self.error: Exception | None = None
        self.calls: list[tuple[bytes, str]] = []

    def readReceipt(self, image: bytes, mimeType: str) -> ReceiptReadingResult:
        self.calls.append((image, mimeType))
        if self.error:
            raise self.error
        return ReceiptReadingResult(receipt=self.receipt, processingMilliseconds=1234, inputTokens=1000, outputTokens=200)


@pytest.fixture
def fakeReader() -> Iterator[FakeReceiptReader]:
    reader = FakeReceiptReader()
    application.dependency_overrides[getReceiptReader] = lambda: reader
    yield reader
    application.dependency_overrides.pop(getReceiptReader, None)


class ScanningHousehold:
    def __init__(self, client: TestClient, giveConsent: bool = True) -> None:
        self.client = client
        self.headers = registerAndAuthorize(client, "anna@example.com", "Anna")
        self.id = createHousehold(client, self.headers)["id"]
        if giveConsent:
            client.post("/auth/me/receipt-consent", headers=self.headers)

    def scan(self, image: bytes = fakeImage, contentType: str = "image/jpeg", headers: dict[str, str] | None = None):
        return self.client.post(
            f"/households/{self.id}/receipts/scan",
            files={"image": ("receipt.jpg", image, contentType)},
            headers=headers or self.headers,
        )


def test_consentIsRecordedOnceAndShownOnTheUser(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    assert client.get("/auth/me", headers=headers).json()["receiptConsentGivenAt"] is None

    first = client.post("/auth/me/receipt-consent", headers=headers).json()["receiptConsentGivenAt"]
    second = client.post("/auth/me/receipt-consent", headers=headers).json()["receiptConsentGivenAt"]

    assert first is not None
    assert first == second
    assert client.get("/auth/me", headers=headers).json()["receiptConsentGivenAt"] == first


def test_scanRequiresConsent(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client, giveConsent=False)

    assert household.scan().status_code == 403
    assert fakeReader.calls == []


def test_scanReturnsItemsAndPassesTheImageToTheReader(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)

    response = household.scan()

    assert response.status_code == 200
    assert fakeReader.calls == [(fakeImage, "image/jpeg")]
    body = response.json()
    assert body["storeName"] == "Albert"
    assert body["purchasedOn"] == "2026-11-10"
    assert body["totalAmount"] == 24.9
    assert body["itemsSumMatchesTotal"] is True
    assert body["processingMilliseconds"] == 1234
    assert body["items"] == [
        {
            "originalText": "MLEKO POLOTUC 1L",
            "name": "Mléko polotučné",
            "genericName": "Mléko",
            "category": "dairy",
            "isFood": True,
            "quantity": 1000,
            "unit": "milliliter",
            "price": 24.9,
            "discount": 0,
            "suggestedFood": None,
        }
    ]


def test_packagesAreSplitIntoSeparateItemsWithSharedPrice(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    fakeReader.receipt = ExtractedReceipt(
        storeName="Lidl",
        purchasedOn=None,
        totalAmount=100,
        items=[
            extractedItem(originalText="MLEKO 1L 3 x 16,67", packageCount=3, price=50.00, discount=3.00),
            extractedItem(originalText="BANANY 0,532 kg", name="Banány", category="fruit", quantityPerPackage=532, unit="gram", price=50),
        ],
    )

    items = household.scan().json()["items"]

    assert [(item["name"], item["quantity"], item["price"], item["discount"]) for item in items] == [
        ("Mléko polotučné", 1000, 16.67, 1.0),
        ("Mléko polotučné", 1000, 16.67, 1.0),
        ("Mléko polotučné", 1000, 16.66, 1.0),
        ("Banány", 532, 50, 0),
    ]


def test_packageCountIsLimited(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    fakeReader.receipt = ExtractedReceipt(
        storeName=None, purchasedOn=None, totalAmount=None, items=[extractedItem(packageCount=500), extractedItem(packageCount=0)]
    )

    assert len(household.scan().json()["items"]) == 21


def test_unknownQuantityUnitAndDateBecomeNull(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    fakeReader.receipt = ExtractedReceipt(
        storeName=None,
        purchasedOn="yesterday",
        totalAmount=None,
        items=[extractedItem(quantityPerPackage=None, unit="gram"), extractedItem(quantityPerPackage=250, unit=None)],
    )

    body = household.scan().json()

    assert body["purchasedOn"] is None
    assert body["itemsSumMatchesTotal"] is False
    assert [(item["quantity"], item["unit"]) for item in body["items"]] == [(None, None), (None, None)]


def test_sumCheckAllowsRoundingToWholeCrowns(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    items = [extractedItem(price=24.90), extractedItem(price=-10.00, isFood=False, name="Sleva Albert Plus")]
    fakeReader.receipt = ExtractedReceipt(storeName="Albert", purchasedOn=None, totalAmount=15.00, items=items)
    rounded = household.scan().json()
    fakeReader.receipt = ExtractedReceipt(storeName="Albert", purchasedOn=None, totalAmount=13.80, items=items)
    mismatched = household.scan().json()

    assert (rounded["itemsSum"], rounded["itemsSumMatchesTotal"]) == (14.9, True)
    assert (mismatched["itemsSum"], mismatched["itemsSumMatchesTotal"]) == (14.9, False)


def test_suggestsExistingFoodIgnoringCaseAndAccents(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    milk = createFood(client, household.headers, household.id, "MLEKO polotucne", baseUnit="milliliter").json()
    fakeReader.receipt = ExtractedReceipt(
        storeName=None, purchasedOn=None, totalAmount=None, items=[extractedItem(), extractedItem(name="Chléb")]
    )

    items = household.scan().json()["items"]

    assert items[0]["suggestedFood"] == milk
    assert items[1]["suggestedFood"] is None


def test_rejectsWrongTypeAndTooLargeImages(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)

    assert household.scan(contentType="application/pdf").status_code == 415
    assert household.scan(image=b"x" * (10 * 1024 * 1024 + 1)).status_code == 413
    assert fakeReader.calls == []


def test_readerFailureReturnsBadGateway(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    fakeReader.error = ReceiptReadingError("timeout")

    response = household.scan()

    assert response.status_code == 502
    assert response.json()["detail"] == "The receipt could not be read"


def test_scanWithoutApiKeyReturnsServiceUnavailable(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    household = ScanningHousehold(client)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    from application.configuration import getConfiguration

    getConfiguration.cache_clear()
    try:
        assert household.scan().status_code == 503
    finally:
        getConfiguration.cache_clear()


def test_strangerCannotScanForAnotherHousehold(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    client.post("/auth/me/receipt-consent", headers=strangerHeaders)

    assert household.scan(headers=strangerHeaders).status_code == 404
    assert fakeReader.calls == []


def test_cleansUpOriginalTextAndStoreName(client: TestClient, fakeReader: FakeReceiptReader) -> None:
    household = ScanningHousehold(client)
    fakeReader.receipt = ExtractedReceipt(
        storeName="  albert ",
        purchasedOn=None,
        totalAmount=None,
        items=[extractedItem(originalText="ALB SYR BALKAN.180 G\n2 x   29,90 Kč", genericName="  ")],
    )

    body = household.scan().json()

    assert body["storeName"] == "Albert"
    assert body["items"][0]["originalText"] == "ALB SYR BALKAN.180 G 2 x 29,90 Kč"
    assert body["items"][0]["genericName"] is None
