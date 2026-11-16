from dataclasses import dataclass
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import HouseholdMember, ReceiptScan, RecipeScan, User
from application.models.enumerations import HouseholdRole
from application.stock import householdTimeZone


class Plan(StrEnum):
    free = "free"
    premium = "premium"


class ScanPeriod(StrEnum):
    month = "month"
    total = "total"


@dataclass(frozen=True)
class PlanLimits:
    receiptScansPerMonth: int
    recipeScans: int
    recipeScanPeriod: ScanPeriod
    householdMembers: int
    spendingMonths: int | None


planLimits = {
    Plan.free: PlanLimits(
        receiptScansPerMonth=10,
        recipeScans=3,
        recipeScanPeriod=ScanPeriod.total,
        householdMembers=6,
        spendingMonths=6,
    ),
    Plan.premium: PlanLimits(
        receiptScansPerMonth=60,
        recipeScans=20,
        recipeScanPeriod=ScanPeriod.month,
        householdMembers=12,
        spendingMonths=None,
    ),
}


def planOf(user: User) -> Plan:
    if user.premiumUntil is not None and user.premiumUntil > datetime.now(timezone.utc):
        return Plan.premium
    return Plan.free


def limitsOf(user: User) -> PlanLimits:
    return planLimits[planOf(user)]


def startOfCurrentMonth() -> datetime:
    now = datetime.now(householdTimeZone)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def usedReceiptScans(session: Session, user: User) -> int:
    return session.scalar(
        select(func.count())
        .select_from(ReceiptScan)
        .where(ReceiptScan.userId == user.id, ReceiptScan.createdAt >= startOfCurrentMonth())
    )


def usedRecipeScans(session: Session, user: User) -> int:
    query = select(func.count()).select_from(RecipeScan).where(RecipeScan.userId == user.id)
    if limitsOf(user).recipeScanPeriod == ScanPeriod.month:
        query = query.where(RecipeScan.createdAt >= startOfCurrentMonth())
    return session.scalar(query)


def householdMemberLimit(session: Session, householdId: int) -> int:
    owners = session.scalars(
        select(User)
        .join(HouseholdMember, HouseholdMember.userId == User.id)
        .where(HouseholdMember.householdId == householdId, HouseholdMember.role == HouseholdRole.owner)
    )
    return max((limitsOf(owner).householdMembers for owner in owners), default=planLimits[Plan.free].householdMembers)


def householdMemberCount(session: Session, householdId: int) -> int:
    return session.scalar(
        select(func.count()).select_from(HouseholdMember).where(HouseholdMember.householdId == householdId)
    )
