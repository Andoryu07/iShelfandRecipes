from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.models import Food, Household, HouseholdMember, PushSubscription, StockItem, StorageLocation
from application.notifications.push import PushSender, sendToSubscriptions

expirationWarningDays = 2
maximumListedItems = 5


def expiringItems(session: Session, householdId: int, today: date) -> list[dict]:
    rows = session.execute(
        select(Food.name, StockItem.expirationDate)
        .join(StockItem, StockItem.foodId == Food.id)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(
            StorageLocation.householdId == householdId,
            StockItem.quantity > 0,
            StockItem.expirationDate >= today,
            StockItem.expirationDate <= today + timedelta(days=expirationWarningDays),
        )
        .order_by(StockItem.expirationDate, Food.name)
    ).all()
    return [{"name": name, "daysLeft": (expirationDate - today).days} for name, expirationDate in rows]


def sendExpirationNotifications(session: Session, sender: PushSender, today: date, force: bool = False) -> int:
    householdQuery = select(Household)
    if not force:
        householdQuery = householdQuery.where(
            (Household.expirationNotifiedOn.is_(None)) | (Household.expirationNotifiedOn < today)
        )
    notifiedHouseholds = 0
    for household in session.scalars(householdQuery).all():
        household.expirationNotifiedOn = today
        items = expiringItems(session, household.id, today)
        subscriptions = list(
            session.scalars(
                select(PushSubscription)
                .join(HouseholdMember, HouseholdMember.userId == PushSubscription.userId)
                .where(HouseholdMember.householdId == household.id)
            )
        )
        if items and subscriptions:
            payload = {"type": "expiration", "count": len(items), "items": items[:maximumListedItems]}
            if sendToSubscriptions(session, sender, subscriptions, payload):
                notifiedHouseholds += 1
        session.commit()
    return notifiedHouseholds
