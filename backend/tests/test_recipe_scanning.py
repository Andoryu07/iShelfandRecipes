import pytest
from fastapi.testclient import TestClient
from sqlalchemy import update
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.main import application
from application.models import User
from application.recipes.dependencies import getRecipeReader
from application.recipes.reading import (
    ExtractedIngredient,
    ExtractedRecipe,
    RecipeReadingError,
    RecipeReadingResult,
)
from tests.test_recipes import Kitchen

photo = ("strana.jpg", b"fake image", "image/jpeg")


def ingredient(name: str, genericName: str, quantity: float | None, unit: str | None, **fields) -> ExtractedIngredient:
    return ExtractedIngredient(
        originalText=fields.pop("originalText", name),
        name=name,
        genericName=genericName,
        category=fields.pop("category", "other"),
        quantity=quantity,
        unit=unit,
        isOptional=fields.pop("isOptional", False),
    )


class FakeRecipeReader:
    def __init__(self) -> None:
        self.calls: list[list[tuple[bytes, str]]] = []
        self.error: Exception | None = None
        self.recipe = ExtractedRecipe(
            isRecipe=True,
            name="  bramboráky ",
            servings=None,
            preparationMinutes=45,
            dishType="mainCourse",
            isVegetarian=True,
            ingredients=[
                ingredient("brambory", "Brambory", 1000, "gram", originalText="1 kg brambor", category="vegetables"),
                ingredient("Vejce", "Vejce", 2, "piece", category="dairy"),
                ingredient("Mouka hladká", "Mouka", 5, "piece", category="dryGoods"),
                ingredient("Sůl", "Sůl", None, "gram", isOptional=True, category="spices"),
            ],
            steps=["Brambory nastrouhej.", " Smíchej  s vejci a moukou. ", ""],
        )

    def readRecipe(self, files: list[tuple[bytes, str]]) -> RecipeReadingResult:
        self.calls.append(files)
        if self.error:
            raise self.error
        return RecipeReadingResult(recipe=self.recipe, processingMilliseconds=1200, inputTokens=900, outputTokens=300)


@pytest.fixture
def fakeReader():
    reader = FakeRecipeReader()
    application.dependency_overrides[getRecipeReader] = lambda: reader
    yield reader
    application.dependency_overrides.pop(getRecipeReader, None)


def scan(client: TestClient, kitchen: Kitchen, photos: list[tuple] | None = None):
    files = [("files", item) for item in (photos if photos is not None else [photo])]
    return client.post(f"/households/{kitchen.householdId}/recipes/scan", files=files, headers=kitchen.anna)


def test_scanNeedsTheRecipePhotoConsent(client: TestClient, fakeReader: FakeRecipeReader, databaseSession: Session) -> None:
    kitchen = Kitchen(client)
    databaseSession.execute(update(User).values(receiptConsentGivenAt=User.createdAt))
    databaseSession.commit()

    assert scan(client, kitchen).status_code == 403
    me = client.post("/auth/me/receipt-consent", headers=kitchen.anna).json()
    assert me["receiptConsentGivenAt"] and me["recipePhotoConsentGivenAt"]
    assert scan(client, kitchen).status_code == 200
    withdrawn = client.delete("/auth/me/receipt-consent", headers=kitchen.anna).json()
    assert withdrawn["recipePhotoConsentGivenAt"] is None
    assert len(fakeReader.calls) == 1


def test_scanReturnsAReviewableRecipe(client: TestClient, fakeReader: FakeRecipeReader) -> None:
    kitchen = Kitchen(client)
    potatoes = kitchen.food("Brambory", "Brambory", baseUnit="gram")
    kitchen.food("Mouka hladká", "Mouka", baseUnit="gram")
    client.post("/auth/me/receipt-consent", headers=kitchen.anna)

    response = scan(client, kitchen, [photo, ("strana2.png", b"second page", "image/png")])

    assert response.status_code == 200
    body = response.json()
    assert (body["name"], body["servings"], body["preparationMinutes"]) == ("Bramboráky", 4, 45)
    assert (body["dishType"], body["isVegetarian"]) == ("mainCourse", True)
    assert body["instructions"] == "1. Brambory nastrouhej.\n2. Smíchej s vejci a moukou."
    assert [
        (item["name"], item["quantity"], item["unit"], item["isOptional"], (item["suggestedFood"] or {}).get("id"))
        for item in body["ingredients"]
    ] == [
        ("Brambory", 1000, "gram", False, potatoes),
        ("Vejce", 2, "piece", False, None),
        ("Mouka hladká", 5, "piece", False, None),
        ("Sůl", None, None, True, None),
    ]
    assert (body["usedScans"], body["scanLimit"]) == (1, 3)
    assert fakeReader.calls[0] == [(b"fake image", "image/jpeg"), (b"second page", "image/png")]


def test_limitCountsSuccessfulScansPerHousehold(client: TestClient, fakeReader: FakeRecipeReader) -> None:
    kitchen = Kitchen(client)
    client.post("/auth/me/receipt-consent", headers=kitchen.anna)
    allowanceUrl = f"/households/{kitchen.householdId}/recipes/scan-allowance"
    assert client.get(allowanceUrl, headers=kitchen.anna).json() == {"usedScans": 0, "scanLimit": 3}

    fakeReader.error = RecipeReadingError("timeout")
    assert scan(client, kitchen).status_code == 502
    fakeReader.error = None
    fakeReader.recipe = fakeReader.recipe.model_copy(update={"isRecipe": False, "ingredients": []})
    assert scan(client, kitchen).status_code == 422
    fakeReader.recipe = FakeRecipeReader().recipe
    assert [scan(client, kitchen).status_code for _ in range(4)] == [200, 200, 200, 429]
    assert client.get(allowanceUrl, headers=kitchen.anna).json() == {"usedScans": 3, "scanLimit": 3}
    assert len(fakeReader.calls) == 5

    manualRecipe = kitchen.recipe([{"foodId": kitchen.food("Mléko", "Mléko"), "quantity": 100}])
    assert manualRecipe.status_code == 201


def test_limitCanBeRaisedOnTheServer(
    client: TestClient, fakeReader: FakeRecipeReader, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("RECIPE_SCAN_LIMIT", "5")
    getConfiguration.cache_clear()
    try:
        kitchen = Kitchen(client)
        client.post("/auth/me/receipt-consent", headers=kitchen.anna)
        assert [scan(client, kitchen).status_code for _ in range(6)] == [200] * 5 + [429]
    finally:
        monkeypatch.delenv("RECIPE_SCAN_LIMIT")
        getConfiguration.cache_clear()


def test_photosAreChecked(client: TestClient, fakeReader: FakeRecipeReader) -> None:
    kitchen = Kitchen(client)
    client.post("/auth/me/receipt-consent", headers=kitchen.anna)

    assert scan(client, kitchen, [photo] * 4).status_code == 422
    assert scan(client, kitchen, [("pozn.txt", b"text", "text/plain")]).status_code == 415
    assert scan(client, kitchen, [("velka.jpg", b"x" * (10 * 1024 * 1024 + 1), "image/jpeg")]).status_code == 413
    assert fakeReader.calls == []
