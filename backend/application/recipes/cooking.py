from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.foods import buildFoodResponse
from application.models import Food, Recipe, RecipeIngredient, Reservation, StockItem, StockMovement, StorageLocation
from application.models.enumerations import ReservationStatus, StockMovementReason
from application.recipes.availability import AvailabilityCalculator, StockSnapshot, scaledQuantity
from application.schemas.recipes import CookedIngredientResponse


def lockHouseholdStock(session: Session, householdId: int) -> None:
    session.execute(
        select(StockItem.id)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(StorageLocation.householdId == householdId, StockItem.quantity > 0)
        .order_by(StockItem.id)
        .with_for_update(of=StockItem)
    )


class Cook:
    def __init__(self, session: Session, recipe: Recipe, userId: int) -> None:
        self.session = session
        self.recipe = recipe
        self.userId = userId
        self.calculator = AvailabilityCalculator(session, recipe.householdId, userId)

    def isOwnForRecipe(self, reservation: Reservation) -> bool:
        return reservation.userId == self.userId and reservation.recipeId == self.recipe.id

    def isProtected(self, reservation: Reservation) -> bool:
        return reservation.userId != self.userId or (
            reservation.recipeId is not None and reservation.recipeId != self.recipe.id
        )

    def takeFrom(self, snapshot: StockSnapshot, needed: Decimal, fromRecipeReservation: bool = False) -> Decimal:
        stockItem = snapshot.stockItem
        protected = sum(
            (reservation.quantity for reservation in snapshot.reservations if self.isProtected(reservation)),
            Decimal(0),
        )
        taken = min(max(stockItem.quantity - protected, Decimal(0)), needed)
        if taken <= 0:
            return Decimal(0)
        stockItem.quantity -= taken
        self.session.add(
            StockMovement(
                stockItemId=stockItem.id, userId=self.userId, quantityChange=-taken, reason=StockMovementReason.cooked
            )
        )
        if fromRecipeReservation:
            recipeReservations = [
                reservation for reservation in snapshot.reservations if self.isOwnForRecipe(reservation)
            ]
            self.reduceReservations(snapshot, recipeReservations, taken)
            return taken
        excess = sum((reservation.quantity for reservation in snapshot.reservations), Decimal(0)) - stockItem.quantity
        ownReservations = sorted(
            (reservation for reservation in snapshot.reservations if not self.isProtected(reservation)),
            key=lambda reservation: not self.isOwnForRecipe(reservation),
        )
        self.reduceReservations(snapshot, ownReservations, excess)
        return taken

    def reduceReservations(self, snapshot: StockSnapshot, reservations: list[Reservation], amount: Decimal) -> None:
        for reservation in reservations:
            if amount <= 0:
                return
            reduction = min(amount, reservation.quantity)
            amount -= reduction
            if reduction == reservation.quantity:
                reservation.status = ReservationStatus.fulfilled
                snapshot.reservations.remove(reservation)
            else:
                reservation.quantity -= reduction

    def cookIngredient(self, ingredient: RecipeIngredient, food: Food, servings: int) -> CookedIngredientResponse:
        needed = scaledQuantity(ingredient.quantity, self.recipe.servings, servings)
        snapshots = self.calculator.matchingSnapshots(food, ingredient.acceptsAnyOfKind)
        deducted = Decimal(0)
        for snapshot in snapshots:
            reservedForRecipe = sum(
                (reservation.quantity for reservation in snapshot.reservations if self.isOwnForRecipe(reservation)),
                Decimal(0),
            )
            if reservedForRecipe > 0 and deducted < needed:
                deducted += self.takeFrom(
                    snapshot, min(reservedForRecipe, needed - deducted), fromRecipeReservation=True
                )
        for snapshot in snapshots:
            if deducted >= needed:
                break
            deducted += self.takeFrom(snapshot, needed - deducted)
        return CookedIngredientResponse(
            ingredientId=ingredient.id,
            food=buildFoodResponse(food),
            isOptional=ingredient.isOptional,
            deductedQuantity=deducted,
            missingQuantity=Decimal(0) if ingredient.isOptional else needed - deducted,
        )

    def cook(self, ingredients: list[tuple[RecipeIngredient, Food]], servings: int) -> list[CookedIngredientResponse]:
        results = [self.cookIngredient(ingredient, food, servings) for ingredient, food in ingredients]
        for snapshot in self.calculator.snapshots:
            for reservation in list(snapshot.reservations):
                if self.isOwnForRecipe(reservation):
                    reservation.status = ReservationStatus.cancelled
        return results
