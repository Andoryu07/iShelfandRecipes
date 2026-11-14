from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.models import Receipt, ReceiptItem
from application.models.enumerations import FoodCategory
from application.schemas.statistics import CategorySpending, MonthSpending, SpendingResponse, StoreSpending


def monthKey(day: date) -> str:
    return f"{day.year:04d}-{day.month:02d}"


def shiftMonth(month: date, offset: int) -> date:
    index = month.year * 12 + month.month - 1 + offset
    return date(index // 12, index % 12 + 1, 1)


def spendingFor(session: Session, householdId: int, selectedMonth: date, monthCount: int) -> SpendingResponse:
    firstMonth = shiftMonth(selectedMonth, -(monthCount - 1))
    afterLastMonth = shiftMonth(selectedMonth, 1)
    receipts = session.scalars(
        select(Receipt).where(
            Receipt.householdId == householdId,
            Receipt.purchasedOn >= min(firstMonth, shiftMonth(selectedMonth, -1)),
            Receipt.purchasedOn < afterLastMonth,
        )
    ).all()
    totalsByMonth: dict[str, Decimal] = defaultdict(Decimal)
    countsByMonth: dict[str, int] = defaultdict(int)
    storeTotals: dict[str | None, Decimal] = defaultdict(Decimal)
    storeCounts: dict[str | None, int] = defaultdict(int)
    selectedKey = monthKey(selectedMonth)
    selectedReceiptIds = []
    for receipt in receipts:
        key = monthKey(receipt.purchasedOn)
        totalsByMonth[key] += receipt.totalAmount
        countsByMonth[key] += 1
        if key == selectedKey:
            selectedReceiptIds.append(receipt.id)
            storeTotals[receipt.storeName] += receipt.totalAmount
            storeCounts[receipt.storeName] += 1

    categoryTotals: dict[FoodCategory, Decimal] = defaultdict(Decimal)
    discountsTotal = Decimal("0.00")
    if selectedReceiptIds:
        for category, price in session.execute(
            select(ReceiptItem.category, ReceiptItem.price).where(ReceiptItem.receiptId.in_(selectedReceiptIds))
        ):
            if price < 0:
                discountsTotal -= price
            else:
                categoryTotals[FoodCategory(category) if category else FoodCategory.other] += price

    months = [shiftMonth(firstMonth, offset) for offset in range(monthCount)]
    return SpendingResponse(
        month=selectedKey,
        monthTotal=totalsByMonth[selectedKey],
        previousMonthTotal=totalsByMonth[monthKey(shiftMonth(selectedMonth, -1))],
        receiptCount=countsByMonth[selectedKey],
        discountsTotal=discountsTotal,
        months=[
            MonthSpending(month=monthKey(month), total=totalsByMonth[monthKey(month)], receiptCount=countsByMonth[monthKey(month)])
            for month in months
        ],
        stores=sorted(
            (StoreSpending(storeName=name, total=total, receiptCount=storeCounts[name]) for name, total in storeTotals.items()),
            key=lambda store: store.total,
            reverse=True,
        ),
        categories=sorted(
            (CategorySpending(category=category, total=total) for category, total in categoryTotals.items()),
            key=lambda category: category.total,
            reverse=True,
        ),
    )
