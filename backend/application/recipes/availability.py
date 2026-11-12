from collections import defaultdict
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.foods import buildFoodResponse
from application.models import Food, Recipe, RecipeIngredient, Reservation, StockItem, StorageLocation
from application.models.enumerations import ReservationStatus
from application.schemas.recipes import IngredientAvailabilityResponse, RecipeAvailabilityResponse

quantityPrecision = Decimal("0.001")


@dataclass
class StockSnapshot:
    stockItem: StockItem
    food: Food
    reservations: list[Reservation] = field(default_factory=list)


def ingredientKey(food: Food, acceptsAnyOfKind: bool) -> tuple:
    if acceptsAnyOfKind and food.genericName:
        return ("kind", food.genericName.strip().lower(), food.baseUnit)
    return ("food", food.id)


def scaledQuantity(quantity: Decimal, recipeServings: int, servings: int) -> Decimal:
    return (quantity * servings / recipeServings).quantize(quantityPrecision, rounding=ROUND_HALF_UP)


class AvailabilityCalculator:
    def __init__(self, session: Session, householdId: int, userId: int) -> None:
        self.session = session
        self.userId = userId
        rows = session.execute(
            select(StockItem, Food)
            .join(Food, Food.id == StockItem.foodId)
            .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
            .where(StorageLocation.householdId == householdId, StockItem.quantity > 0)
            .order_by(StockItem.expirationDate.asc().nulls_last(), StockItem.id)
        ).all()
        self.snapshots = [StockSnapshot(stockItem, food) for stockItem, food in rows]
        snapshotsById = {snapshot.stockItem.id: snapshot for snapshot in self.snapshots}
        reservations = session.scalars(
            select(Reservation).where(
                Reservation.stockItemId.in_(list(snapshotsById)), Reservation.status == ReservationStatus.active
            )
        )
        for reservation in reservations:
            snapshotsById[reservation.stockItemId].reservations.append(reservation)
        self.snapshotsByFoodId: dict[int, list[StockSnapshot]] = defaultdict(list)
        self.snapshotsByKind: dict[tuple, list[StockSnapshot]] = defaultdict(list)
        for snapshot in self.snapshots:
            self.snapshotsByFoodId[snapshot.food.id].append(snapshot)
            if snapshot.food.genericName:
                self.snapshotsByKind[ingredientKey(snapshot.food, True)].append(snapshot)

    def matchingSnapshots(self, food: Food, acceptsAnyOfKind: bool) -> list[StockSnapshot]:
        key = ingredientKey(food, acceptsAnyOfKind)
        return self.snapshotsByKind[key] if key[0] == "kind" else self.snapshotsByFoodId[food.id]

    def availableFor(self, snapshot: StockSnapshot, recipeId: int) -> Decimal:
        unavailable = sum(
            (
                reservation.quantity
                for reservation in snapshot.reservations
                if reservation.userId != self.userId
                or (reservation.recipeId is not None and reservation.recipeId != recipeId)
            ),
            Decimal(0),
        )
        return max(snapshot.stockItem.quantity - unavailable, Decimal(0))

    def calculate(
        self, recipe: Recipe, ingredients: list[tuple[RecipeIngredient, Food]], servings: int | None = None
    ) -> RecipeAvailabilityResponse:
        servings = servings or recipe.servings
        results = []
        for ingredient, food in ingredients:
            snapshots = self.matchingSnapshots(food, ingredient.acceptsAnyOfKind)
            required = scaledQuantity(ingredient.quantity, recipe.servings, servings)
            available = sum((self.availableFor(snapshot, recipe.id) for snapshot in snapshots), Decimal(0))
            reservedForRecipe = sum(
                (
                    reservation.quantity
                    for snapshot in snapshots
                    for reservation in snapshot.reservations
                    if reservation.userId == self.userId and reservation.recipeId == recipe.id
                ),
                Decimal(0),
            )
            reservedByOthers = sum(
                (
                    reservation.quantity
                    for snapshot in snapshots
                    for reservation in snapshot.reservations
                    if reservation.userId != self.userId
                ),
                Decimal(0),
            )
            results.append(
                IngredientAvailabilityResponse(
                    ingredientId=ingredient.id,
                    food=buildFoodResponse(food),
                    acceptsAnyOfKind=ingredient.acceptsAnyOfKind,
                    isOptional=ingredient.isOptional,
                    requiredQuantity=required,
                    availableQuantity=available,
                    missingQuantity=max(required - available, Decimal(0)),
                    reservedForRecipe=reservedForRecipe,
                    reservedByOthers=reservedByOthers,
                )
            )
        results.sort(key=lambda result: (result.isOptional, result.missingQuantity == 0, result.food.name.lower()))
        return RecipeAvailabilityResponse(
            recipeId=recipe.id,
            servings=servings,
            missingCount=sum(1 for result in results if result.missingQuantity > 0 and not result.isOptional),
            ingredients=results,
        )
