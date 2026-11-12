from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import Food, Receipt, ReceiptItem, StockItem, StorageLocation, User
from application.models.enumerations import FoodCategory
from application.receipts.scanning import sumTolerance
from application.schemas.receipts import (
    ReceiptItemResponse,
    ReceiptResponse,
    ReceiptSummaryResponse,
    SaveReceiptItemRequest,
    SaveReceiptRequest,
)


def invalidItemError(index: int, message: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=f"Item {index + 1}: {message}")


class FoodResolver:
    def __init__(self, session: Session, householdId: int) -> None:
        self.session = session
        self.householdId = householdId
        self.foodsById = {food.id: food for food in session.scalars(select(Food).where(Food.householdId == householdId))}

    def resolve(self, index: int, item: SaveReceiptItemRequest) -> Food | None:
        if item.foodId is not None:
            food = self.foodsById.get(item.foodId)
            if food is None:
                raise invalidItemError(index, "food not found")
            return food
        if item.newFood is None:
            return None
        lowerName = item.newFood.name.lower()
        existing = next(
            (food for food in self.foodsById.values() if food.name.lower() == lowerName),
            None,
        )
        if existing is not None:
            return existing
        food = Food(
            householdId=self.householdId,
            name=item.newFood.name,
            genericName=item.newFood.genericName or None,
            category=item.newFood.category.value,
            baseUnit=item.newFood.baseUnit,
        )
        self.session.add(food)
        self.session.flush()
        self.foodsById[food.id] = food
        return food


def saveReceipt(session: Session, householdId: int, user: User, request: SaveReceiptRequest) -> int:
    storageLocationIds = set(
        session.scalars(select(StorageLocation.id).where(StorageLocation.householdId == householdId))
    )
    itemsSum = sum((item.price for item in request.items), Decimal("0.00"))
    receipt = Receipt(
        householdId=householdId,
        userId=user.id,
        storeName=request.storeName or None,
        purchasedOn=request.purchasedOn,
        totalAmount=request.totalAmount,
        itemsSumMatchesTotal=abs(itemsSum - request.totalAmount) <= sumTolerance,
        processingMilliseconds=request.processingMilliseconds,
    )
    session.add(receipt)
    session.flush()
    foodResolver = FoodResolver(session, householdId)
    for index, item in enumerate(request.items):
        food = foodResolver.resolve(index, item)
        receiptItem = ReceiptItem(
            receiptId=receipt.id,
            foodId=food.id if food else None,
            originalText=item.originalText,
            name=item.name,
            category=item.category.value,
            quantity=item.quantity,
            unit=item.unit,
            price=item.price,
            discount=item.discount,
            correctedByUser=item.correctedByUser,
        )
        session.add(receiptItem)
        session.flush()
        if not item.addToStock:
            continue
        if item.storageLocationId not in storageLocationIds:
            raise invalidItemError(index, "storage location not found")
        if item.unit is not None and item.unit != food.baseUnit:
            raise invalidItemError(index, f"quantity must be in {food.baseUnit.value}")
        session.add(
            StockItem(
                storageLocationId=item.storageLocationId,
                foodId=food.id,
                quantity=item.quantity,
                expirationDate=item.expirationDate,
                receiptItemId=receiptItem.id,
            )
        )
    session.flush()
    return receipt.id


def receiptSummariesQuery(householdId: int):
    itemCounts = (
        select(ReceiptItem.receiptId, func.count().label("itemCount")).group_by(ReceiptItem.receiptId).subquery()
    )
    return (
        select(Receipt, User.displayName, func.coalesce(itemCounts.c.itemCount, 0).label("itemCount"))
        .outerjoin(User, User.id == Receipt.userId)
        .outerjoin(itemCounts, itemCounts.c.receiptId == Receipt.id)
        .where(Receipt.householdId == householdId)
    )


def buildReceiptSummary(receipt: Receipt, displayName: str | None, itemCount: int) -> ReceiptSummaryResponse:
    return ReceiptSummaryResponse(
        id=receipt.id,
        storeName=receipt.storeName,
        purchasedOn=receipt.purchasedOn,
        totalAmount=receipt.totalAmount,
        itemsSumMatchesTotal=receipt.itemsSumMatchesTotal,
        itemCount=itemCount,
        uploadedByDisplayName=displayName,
        createdAt=receipt.createdAt,
    )


def loadReceiptResponse(session: Session, householdId: int, receiptId: int) -> ReceiptResponse | None:
    row = session.execute(receiptSummariesQuery(householdId).where(Receipt.id == receiptId)).first()
    if row is None:
        return None
    itemRows = session.execute(
        select(ReceiptItem, StockItem.id.label("stockItemId"))
        .outerjoin(StockItem, StockItem.receiptItemId == ReceiptItem.id)
        .where(ReceiptItem.receiptId == receiptId)
        .order_by(ReceiptItem.id)
    ).all()
    summary = buildReceiptSummary(row.Receipt, row.displayName, row.itemCount)
    return ReceiptResponse(
        **summary.model_dump(),
        items=[
            ReceiptItemResponse(
                id=receiptItem.id,
                originalText=receiptItem.originalText,
                name=receiptItem.name,
                category=FoodCategory(receiptItem.category) if receiptItem.category else FoodCategory.other,
                quantity=receiptItem.quantity,
                unit=receiptItem.unit,
                price=receiptItem.price,
                discount=receiptItem.discount,
                correctedByUser=receiptItem.correctedByUser,
                foodId=receiptItem.foodId,
                stockItemId=stockItemId,
            )
            for receiptItem, stockItemId in itemRows
        ],
    )
