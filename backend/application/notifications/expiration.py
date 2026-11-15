from datetime import date, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from application.models import Food, HouseholdMember, PushSubscription, StockItem, StorageLocation
from application.notifications.push import PushSender, sendToSubscriptions

maximumListedItems = 5


def expiringItems(session: Session, householdId: int, today: date, warningDays: int) -> list[dict]:
    rows = session.execute(
        select(Food.name, StockItem.expirationDate)
        .join(StockItem, StockItem.foodId == Food.id)
        .join(StorageLocation, StorageLocation.id == StockItem.storageLocationId)
        .where(
            StorageLocation.householdId == householdId,
            StockItem.quantity > 0,
            StockItem.expirationDate >= today,
            StockItem.expirationDate <= today + timedelta(days=warningDays),
        )
        .order_by(StockItem.expirationDate, Food.name)
    ).all()
    return [{"name": name, "daysLeft": (expirationDate - today).days} for name, expirationDate in rows]


def sendExpirationNotifications(session: Session, sender: PushSender, now: datetime, force: bool = False) -> int:
    today = now.date()
    membershipQuery = select(HouseholdMember).where(
        HouseholdMember.userId.in_(select(PushSubscription.userId).where(PushSubscription.userId.is_not(None)))
    )
    if not force:
        membershipQuery = membershipQuery.where(
            HouseholdMember.notificationHour <= now.hour,
            (HouseholdMember.expirationNotifiedOn.is_(None)) | (HouseholdMember.expirationNotifiedOn < today),
        )
    itemsByHouseholdAndDays: dict[tuple[int, int], list[dict]] = {}
    notifiedMembers = 0
    for membership in session.scalars(membershipQuery.order_by(HouseholdMember.id)).all():
        membership.expirationNotifiedOn = today
        key = (membership.householdId, membership.expirationWarningDays)
        if key not in itemsByHouseholdAndDays:
            itemsByHouseholdAndDays[key] = expiringItems(
                session, membership.householdId, today, membership.expirationWarningDays
            )
        items = itemsByHouseholdAndDays[key]
        subscriptions = list(
            session.scalars(select(PushSubscription).where(PushSubscription.userId == membership.userId))
        )
        if items and subscriptions:
            payload = {"type": "expiration", "count": len(items), "items": items[:maximumListedItems]}
            if sendToSubscriptions(session, sender, subscriptions, payload):
                notifiedMembers += 1
        session.commit()
    return notifiedMembers
