import pytest
from fastapi.testclient import TestClient

from application.models.enumerations import FoodCategory, UnhealthyKind
from application.unhealthy import classifyUnhealthy
from tests.helpers import createHousehold, makePremium, registerAndAuthorize


@pytest.mark.parametrize(
    ("name", "originalText", "category", "expected"),
    [
        ("Pivo Pilsner Urquell", "PILSNER URQ.0,5L", "beverages", UnhealthyKind.alcohol),
        ("Pivo nealkoholické", "BIRELL NEALKO", "beverages", None),
        ("Coca-Cola", "COCA COLA 1,5L", "beverages", UnhealthyKind.sugaryDrinks),
        ("Coca-Cola Zero", "COCA COLA ZERO", "beverages", None),
        ("Chipsy solené", "BRAMB.LUPINKY", "other", UnhealthyKind.saltySnacks),
        ("Čokoláda mléčná", "MILKA 100G", "sweets", UnhealthyKind.sweets),
        ("Bonpari", "BONPARI", FoodCategory.sweets, UnhealthyKind.sweets),
        ("Cigarety Marlboro", "MARLBORO RED", "other", UnhealthyKind.tobacco),
        ("Mléko polotučné", "MLEKO 1L", "dairy", None),
    ],
)
def test_receiptItemsAreClassified(name, originalText, category, expected) -> None:
    assert classifyUnhealthy(name, originalText, category) == expected


def saveReceipt(client: TestClient, headers: dict, householdId: int, purchasedOn: str, items: list[dict]) -> None:
    body = {
        "storeName": "Albert",
        "purchasedOn": purchasedOn,
        "totalAmount": round(sum(item["price"] for item in items), 2),
        "items": [{"originalText": item["name"].upper(), "category": "other", **item} for item in items],
    }
    assert client.post(f"/households/{householdId}/receipts", json=body, headers=headers).status_code == 201


def test_unhealthySpendingIsSummedForPremiumUsers(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    saveReceipt(
        client,
        headers,
        householdId,
        "2026-11-05",
        [
            {"name": "Pivo Kozel", "price": 25},
            {"name": "Čokoláda", "price": 30, "category": "sweets"},
            {"name": "Mléko", "price": 20},
            {"name": "Zdravé müsli", "price": 60, "unhealthyKind": "sweets"},
            {"name": "Kofola", "price": 35, "unhealthyKind": "none"},
            {"name": "Sleva", "price": -10},
        ],
    )
    saveReceipt(client, headers, householdId, "2026-10-20", [{"name": "Víno červené", "price": 120}])
    url = f"/households/{householdId}/statistics/unhealthy-spending"

    assert client.get(url, params={"month": "2026-11"}, headers=headers).status_code == 403
    makePremium("anna@example.com")
    body = client.get(url, params={"month": "2026-11", "months": 3}, headers=headers).json()

    assert (body["total"], body["monthTotal"], body["previousMonthTotal"]) == (115, 160, 120)
    assert [(kind["kind"], kind["total"]) for kind in body["kinds"]] == [("sweets", 90), ("alcohol", 25)]
    assert [(month["month"], month["total"]) for month in body["months"]] == [
        ("2026-09", 0),
        ("2026-10", 120),
        ("2026-11", 115),
    ]
