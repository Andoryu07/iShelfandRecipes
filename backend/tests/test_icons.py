from fastapi.testclient import TestClient

from tests.helpers import createHousehold, registerAndAuthorize


def test_storageLocationIconCanBeSetChangedAndCleared(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, headers)

    created = client.post(
        f"/households/{household['id']}/storage-locations", json={"name": "Sklep", "icon": "🍷"}, headers=headers
    ).json()
    assert created["icon"] == "🍷"

    renamed = client.patch(f"/storage-locations/{created['id']}", json={"name": "Vinný sklep"}, headers=headers)
    assert renamed.json()["icon"] == "🍷"

    cleared = client.patch(f"/storage-locations/{created['id']}", json={"icon": None}, headers=headers)
    assert cleared.json()["icon"] is None


def test_foodIconCanBeSetAndCleared(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, headers)

    food = client.post(
        f"/households/{household['id']}/foods", json={"name": "Brynza", "baseUnit": "gram", "icon": "🧀"}, headers=headers
    ).json()
    assert food["icon"] == "🧀"

    changed = client.patch(f"/foods/{food['id']}", json={"icon": "🐑"}, headers=headers).json()
    assert changed["icon"] == "🐑"
    assert client.patch(f"/foods/{food['id']}", json={"category": "dairy"}, headers=headers).json()["icon"] == "🐑"
    assert client.patch(f"/foods/{food['id']}", json={"icon": None}, headers=headers).json()["icon"] is None


def test_recipeIconAppearsInListAndDetail(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, headers)

    recipe = client.post(
        f"/households/{household['id']}/recipes",
        json={"name": "Palačinky", "servings": 2, "icon": "🥞", "ingredients": []},
        headers=headers,
    ).json()
    assert recipe["icon"] == "🥞"
    summaries = client.get(f"/households/{household['id']}/recipes", headers=headers).json()
    assert [summary["icon"] for summary in summaries] == ["🥞"]

    assert client.patch(f"/recipes/{recipe['id']}", json={"name": "Lívance"}, headers=headers).json()["icon"] == "🥞"
    assert client.patch(f"/recipes/{recipe['id']}", json={"icon": None}, headers=headers).json()["icon"] is None


def test_iconMustBeShortAndNotPlainText(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    household = createHousehold(client, headers)
    url = f"/households/{household['id']}/storage-locations"

    for icon in ["A", "<b>", "", "🍷" * 20]:
        response = client.post(url, json={"name": "Sklep", "icon": icon}, headers=headers)
        assert response.status_code == 422, icon
