from fastapi.testclient import TestClient

from datetime import date

from tests.helpers import createHousehold, makePremium, registerAndAuthorize


def saveReceipt(client: TestClient, headers: dict[str, str], householdId: int, storeName: str, purchasedOn: str, items: list[tuple[str, str, float]]) -> None:
    response = client.post(
        f"/households/{householdId}/receipts",
        json={
            "storeName": storeName,
            "purchasedOn": purchasedOn,
            "totalAmount": round(sum(price for _, _, price in items), 2),
            "items": [{"originalText": name, "name": name, "category": category, "price": price} for name, category, price in items],
        },
        headers=headers,
    )
    assert response.status_code == 201


def test_spendingByMonthStoreAndCategory(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    makePremium("anna@example.com")
    saveReceipt(client, headers, householdId, "Albert", "2026-11-03", [("Mléko", "dairy", 30), ("Šunka", "meatAndSausages", 50), ("Sleva", "other", -10)])
    saveReceipt(client, headers, householdId, "Lidl", "2026-11-20", [("Sýr", "dairy", 100)])
    saveReceipt(client, headers, householdId, "Albert", "2026-11-25", [("Chléb", "bakery", 30)])
    saveReceipt(client, headers, householdId, "Billa", "2026-10-10", [("Káva", "beverages", 200)])
    saveReceipt(client, headers, householdId, "Billa", "2026-04-10", [("Čaj", "beverages", 40)])

    body = client.get(
        f"/households/{householdId}/statistics/spending", params={"month": "2026-11"}, headers=headers
    ).json()

    assert (body["month"], body["monthTotal"], body["previousMonthTotal"], body["receiptCount"], body["discountsTotal"]) == (
        "2026-11",
        200,
        200,
        3,
        10,
    )
    assert [(month["month"], month["total"]) for month in body["months"]] == [
        ("2026-06", 0),
        ("2026-07", 0),
        ("2026-08", 0),
        ("2026-09", 0),
        ("2026-10", 200),
        ("2026-11", 200),
    ]
    assert [(store["storeName"], store["total"], store["receiptCount"]) for store in body["stores"]] == [
        ("Albert", 100, 2),
        ("Lidl", 100, 1),
    ]
    assert [(category["category"], category["total"]) for category in body["categories"]] == [
        ("dairy", 130),
        ("meatAndSausages", 50),
        ("bakery", 30),
    ]

    year = client.get(
        f"/households/{householdId}/statistics/spending", params={"month": "2026-11", "months": 12}, headers=headers
    ).json()
    assert len(year["months"]) == 12
    assert year["months"][0] == {"month": "2025-12", "total": 0, "receiptCount": 0}
    assert next(month for month in year["months"] if month["month"] == "2026-04")["total"] == 40


def test_spendingValidatesInputAndMembership(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    stranger = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    householdId = createHousehold(client, headers)["id"]

    assert client.get(f"/households/{householdId}/statistics/spending", params={"month": "2026-13"}, headers=headers).status_code == 422
    assert client.get(f"/households/{householdId}/statistics/spending", params={"month": "11/2026"}, headers=headers).status_code == 422
    assert client.get(f"/households/{householdId}/statistics/spending", headers=stranger).status_code == 404
    empty = client.get(f"/households/{householdId}/statistics/spending", headers=headers).json()
    assert (empty["monthTotal"], empty["stores"], empty["categories"], len(empty["months"])) == (0, [], [], 6)


def shiftedMonth(months: int) -> str:
    today = date.today()
    index = today.year * 12 + today.month - 1 + months
    return f"{index // 12}-{index % 12 + 1:02d}"


def test_freePlanSeesSixMonthsOfSpending(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    url = f"/households/{householdId}/statistics/spending"

    year = client.get(url, params={"months": 12}, headers=headers).json()
    assert [month["month"] for month in year["months"]] == [shiftedMonth(offset) for offset in range(-5, 1)]
    oldest = client.get(url, params={"month": shiftedMonth(-5), "months": 6}, headers=headers).json()
    assert [month["month"] for month in oldest["months"]] == [shiftedMonth(-5)]
    assert client.get(url, params={"month": shiftedMonth(-6)}, headers=headers).status_code == 403

    makePremium("anna@example.com")
    assert client.get(url, params={"month": shiftedMonth(-6)}, headers=headers).status_code == 200
    assert len(client.get(url, params={"months": 12}, headers=headers).json()["months"]) == 12
