from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.models import StorageLocation, StockItem
from tests.helpers import createHousehold, registerAndAuthorize


def createFood(client: TestClient, headers: dict[str, str], householdId: int, name: str, **fields):
    body = {"name": name, "baseUnit": "gram", **fields}
    return client.post(f"/households/{householdId}/foods", json=body, headers=headers)


def test_createAndListFoodsSortedByName(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]

    created = createFood(client, headers, householdId, " Mléko ", baseUnit="milliliter", category="dairy")
    createFood(client, headers, householdId, "chléb", category="bakery", baseUnit="piece")
    createFood(client, headers, householdId, "Banány")

    assert created.status_code == 201
    assert created.json() == {
        "id": created.json()["id"],
        "name": "Mléko",
        "genericName": None,
        "category": "dairy",
        "baseUnit": "milliliter",
        "icon": None,
        "photoUrl": None,
    }
    names = [food["name"] for food in client.get(f"/households/{householdId}/foods", headers=headers).json()]
    assert names == ["Banány", "Chléb", "Mléko"]
    renamed = client.patch(f"/foods/{created.json()['id']}", json={"name": "mléko plnotučné"}, headers=headers)
    assert renamed.json()["name"] == "Mléko plnotučné"


def test_categoryDefaultsToOtherAndMustBeKnown(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]

    assert createFood(client, headers, householdId, "Something").json()["category"] == "other"
    assert createFood(client, headers, householdId, "Thing", category="toys").status_code == 422
    assert createFood(client, headers, householdId, "Thing", baseUnit="kilogram").status_code == 422


def test_searchIgnoresCaseAndAccents(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    for name in ["Mléko polotučné", "Máslo", "Kakao 100%"]:
        createFood(client, headers, householdId, name)

    def search(text: str) -> list[str]:
        response = client.get(f"/households/{householdId}/foods", params={"search": text}, headers=headers)
        return [food["name"] for food in response.json()]

    assert search("MLEKO") == ["Mléko polotučné"]
    assert search("ásl") == ["Máslo"]
    assert search("100%") == ["Kakao 100%"]
    assert search("%") == ["Kakao 100%"]


def test_foodNamesAreUniqueIgnoringCaseWithinHousehold(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    petrHeaders = registerAndAuthorize(client, "petr@example.com", "Petr")
    annaHouseholdId = createHousehold(client, annaHeaders)["id"]
    petrHouseholdId = createHousehold(client, petrHeaders)["id"]
    createFood(client, annaHeaders, annaHouseholdId, "Mléko")
    other = createFood(client, annaHeaders, annaHouseholdId, "Máslo").json()

    assert createFood(client, annaHeaders, annaHouseholdId, "mléko").status_code == 409
    assert client.patch(f"/foods/{other['id']}", json={"name": "MLÉKO"}, headers=annaHeaders).status_code == 409
    assert createFood(client, petrHeaders, petrHouseholdId, "Mléko").status_code == 201


def test_updateFoodAndBlockUnitChangeWhenInStock(client: TestClient, databaseSession: Session) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    food = createFood(client, headers, householdId, "Rýže").json()

    updated = client.patch(
        f"/foods/{food['id']}",
        json={"name": "Rýže basmati", "genericName": "Rýže", "category": "dryGoods", "baseUnit": "piece"},
        headers=headers,
    )
    assert updated.json() == {
        "id": food["id"],
        "name": "Rýže basmati",
        "genericName": "Rýže",
        "category": "dryGoods",
        "baseUnit": "piece",
        "icon": None,
        "photoUrl": None,
    }
    assert client.patch(f"/foods/{food['id']}", json={"category": "other"}, headers=headers).json()["genericName"] == "Rýže"
    assert client.patch(f"/foods/{food['id']}", json={"genericName": None}, headers=headers).json()["genericName"] is None

    storageLocationId = databaseSession.scalar(
        select(StorageLocation.id).where(StorageLocation.householdId == householdId)
    )
    databaseSession.add(StockItem(storageLocationId=storageLocationId, foodId=food["id"], quantity=Decimal(2)))
    databaseSession.commit()

    assert client.patch(f"/foods/{food['id']}", json={"baseUnit": "gram"}, headers=headers).status_code == 409
    assert client.patch(f"/foods/{food['id']}", json={"baseUnit": "piece", "name": "Rýže"}, headers=headers).status_code == 200


def test_strangerCannotSeeOrChangeFoods(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    householdId = createHousehold(client, annaHeaders)["id"]
    food = createFood(client, annaHeaders, householdId, "Mléko").json()

    assert client.get(f"/households/{householdId}/foods", headers=strangerHeaders).status_code == 404
    assert createFood(client, strangerHeaders, householdId, "Sýr").status_code == 404
    assert client.patch(f"/foods/{food['id']}", json={"name": "Mine"}, headers=strangerHeaders).status_code == 404


def test_uploadShowAndRemoveFoodPhoto(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    food = createFood(client, headers, householdId, "Mléko").json()
    photo = b"RIFF0000WEBPphoto"

    uploaded = client.put(f"/foods/{food['id']}/photo", files={"file": ("photo.webp", photo, "image/webp")}, headers=headers)

    assert uploaded.status_code == 200
    photoUrl = uploaded.json()["photoUrl"]
    assert photoUrl.startswith(f"/foods/{food['id']}/photo?version=")
    listed = client.get(f"/households/{householdId}/foods", headers=headers).json()
    assert listed[0]["photoUrl"] == photoUrl
    shown = client.get(photoUrl)
    assert shown.status_code == 200
    assert shown.content == photo
    assert shown.headers["content-type"] == "image/webp"
    assert "immutable" in shown.headers["cache-control"]

    removed = client.delete(f"/foods/{food['id']}/photo", headers=headers)
    assert removed.json()["photoUrl"] is None
    assert client.get(photoUrl).status_code == 404


def test_foodPhotoNeedsValidSignatureAndVersion(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    food = createFood(client, headers, householdId, "Mléko").json()
    photoUrl = client.put(
        f"/foods/{food['id']}/photo", files={"file": ("photo.jpg", b"jpeg", "image/jpeg")}, headers=headers
    ).json()["photoUrl"]
    path, query = photoUrl.split("?")
    version = query.split("&")[0].split("=")[1]
    signature = query.split("signature=")[1]

    assert client.get(f"{path}?version={version}&signature={'0' * len(signature)}").status_code == 404
    assert client.get(f"{path}?version={int(version) + 1}&signature={signature}").status_code == 404
    otherFood = createFood(client, headers, householdId, "Sýr").json()
    assert client.get(f"/foods/{otherFood['id']}/photo?version={version}&signature={signature}").status_code == 404
    client.put(f"/foods/{food['id']}/photo", files={"file": ("new.jpg", b"new", "image/jpeg")}, headers=headers)
    assert client.get(photoUrl).status_code == 404


def test_foodPhotoMustBeSmallImage(client: TestClient) -> None:
    headers = registerAndAuthorize(client, "anna@example.com", "Anna")
    householdId = createHousehold(client, headers)["id"]
    food = createFood(client, headers, householdId, "Mléko").json()

    tooLarge = client.put(
        f"/foods/{food['id']}/photo", files={"file": ("p.webp", b"x" * (100 * 1024 + 1), "image/webp")}, headers=headers
    )
    wrongType = client.put(f"/foods/{food['id']}/photo", files={"file": ("p.gif", b"gif", "image/gif")}, headers=headers)

    assert tooLarge.status_code == 413
    assert wrongType.status_code == 415


def test_strangerCannotChangeFoodPhoto(client: TestClient) -> None:
    annaHeaders = registerAndAuthorize(client, "anna@example.com", "Anna")
    strangerHeaders = registerAndAuthorize(client, "stranger@example.com", "Stranger")
    householdId = createHousehold(client, annaHeaders)["id"]
    food = createFood(client, annaHeaders, householdId, "Mléko").json()

    files = {"file": ("photo.webp", b"webp", "image/webp")}
    assert client.put(f"/foods/{food['id']}/photo", files=files, headers=strangerHeaders).status_code == 404
    assert client.delete(f"/foods/{food['id']}/photo", headers=strangerHeaders).status_code == 404
