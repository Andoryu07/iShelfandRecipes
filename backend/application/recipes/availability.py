from collections import defaultdict
from dataclasses import dataclass, field
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.foods import buildFoodResponse
from application.models import Food, Receipt, ReceiptItem, Recipe, RecipeIngredient, Reservation, StockItem, StorageLocation
from application.models.enumerations import ReservationStatus
from application.schemas.recipes import IngredientAvailabilityResponse, RecipeAvailabilityResponse

quantityPrecision = Decimal("0.001")
unitPricePrecision = Decimal("0.000001")
moneyPrecision = Decimal("0.01")


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


class LatestPrices:
    def __init__(self, session: Session, householdId: int) -> None:
        self.byFoodId: dict[int, Decimal] = {}
        self.byKind: dict[tuple, Decimal] = {}
        rows = session.execute(
            select(ReceiptItem.price, ReceiptItem.quantity, Food)
            .join(Receipt, Receipt.id == ReceiptItem.receiptId)
            .join(Food, Food.id == ReceiptItem.foodId)
            .where(
                Receipt.householdId == householdId,
                ReceiptItem.quantity > 0,
                ReceiptItem.price > 0,
                ReceiptItem.unit == Food.baseUnit,
            )
            .order_by(Receipt.purchasedOn.desc(), Receipt.id.desc(), ReceiptItem.id.desc())
        ).all()
        for price, quantity, food in rows:
            unitPrice = (price / quantity).quantize(unitPricePrecision, rounding=ROUND_HALF_UP)
            self.byFoodId.setdefault(food.id, unitPrice)
            if food.genericName:
                self.byKind.setdefault(ingredientKey(food, True), unitPrice)

    def unitPriceFor(self, food: Food, acceptsAnyOfKind: bool) -> Decimal | None:
        if food.id in self.byFoodId:
            return self.byFoodId[food.id]
        key = ingredientKey(food, acceptsAnyOfKind)
        return self.byKind.get(key) if key[0] == "kind" else None


class AvailabilityCalculator:
    def __init__(self, session: Session, householdId: int, userId: int) -> None:
        self.session = session
        self.householdId = householdId
        self.userId = userId
        self.latestPrices: LatestPrices | None = None
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
        self,
        recipe: Recipe,
        ingredients: list[tuple[RecipeIngredient, Food]],
        servings: int | None = None,
        includePrices: bool = False,
    ) -> RecipeAvailabilityResponse:
        servings = servings or recipe.servings
        if includePrices and self.latestPrices is None:
            self.latestPrices = LatestPrices(self.session, self.householdId)
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
            unitPrice = self.latestPrices.unitPriceFor(food, ingredient.acceptsAnyOfKind) if includePrices else None
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
                    unitPrice=unitPrice,
                    estimatedPrice=(
                        (required * unitPrice).quantize(moneyPrecision, rounding=ROUND_HALF_UP)
                        if unitPrice is not None
                        else None
                    ),
                )
            )
        results.sort(key=lambda result: (result.isOptional, result.missingQuantity == 0, result.food.name.lower()))
        requiredResults = [result for result in results if not result.isOptional]
        pricedResults = [result for result in requiredResults if result.estimatedPrice is not None]
        return RecipeAvailabilityResponse(
            recipeId=recipe.id,
            servings=servings,
            missingCount=sum(1 for result in requiredResults if result.missingQuantity > 0),
            estimatedPrice=sum((result.estimatedPrice for result in pricedResults), Decimal("0.00"))
            if pricedResults
            else None,
            pricedIngredientCount=len(pricedResults),
            requiredIngredientCount=len(requiredResults),
            ingredients=results,
        )
