from dataclasses import dataclass
from datetime import datetime, timezone
from enum import StrEnum

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import HouseholdMember, ReceiptScan, RecipeScan, RewardedAdView, StorageLocation, User
from application.models.enumerations import HouseholdRole, RewardKind
from application.stock import householdTimeZone


class Plan(StrEnum):
    guest = "guest"
    free = "free"
    premium = "premium"


class ScanPeriod(StrEnum):
    month = "month"
    total = "total"


@dataclass(frozen=True)
class PlanLimits:
    receiptScans: int
    receiptScanPeriod: ScanPeriod
    recipeScans: int
    recipeScanPeriod: ScanPeriod
    households: int
    householdMembers: int
    storageLocations: int
    spendingMonths: int | None
    canShareHousehold: bool
    canUploadFoodPhotos: bool
    showsAds: bool
    canWatchRewardedAds: bool


planLimits = {
    Plan.guest: PlanLimits(
        receiptScans=1,
        receiptScanPeriod=ScanPeriod.total,
        recipeScans=0,
        recipeScanPeriod=ScanPeriod.total,
        households=1,
        householdMembers=1,
        storageLocations=3,
        spendingMonths=1,
        canShareHousehold=False,
        canUploadFoodPhotos=False,
        showsAds=True,
        canWatchRewardedAds=False,
    ),
    Plan.free: PlanLimits(
        receiptScans=10,
        receiptScanPeriod=ScanPeriod.month,
        recipeScans=3,
        recipeScanPeriod=ScanPeriod.total,
        households=1,
        householdMembers=6,
        storageLocations=3,
        spendingMonths=6,
        canShareHousehold=True,
        canUploadFoodPhotos=True,
        showsAds=True,
        canWatchRewardedAds=True,
    ),
    Plan.premium: PlanLimits(
        receiptScans=60,
        receiptScanPeriod=ScanPeriod.month,
        recipeScans=20,
        recipeScanPeriod=ScanPeriod.month,
        households=3,
        householdMembers=12,
        storageLocations=9,
        spendingMonths=None,
        canShareHousehold=True,
        canUploadFoodPhotos=True,
        showsAds=False,
        canWatchRewardedAds=False,
    ),
}
rewardedAdsPerDay = 3


def planOf(user: User) -> Plan:
    if user.isGuest:
        return Plan.guest
    if user.premiumUntil is not None and user.premiumUntil > datetime.now(timezone.utc):
        return Plan.premium
    return Plan.free


def limitsOf(user: User) -> PlanLimits:
    return planLimits[planOf(user)]


def startOfCurrentMonth() -> datetime:
    now = datetime.now(householdTimeZone)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def startOfToday() -> datetime:
    return datetime.now(householdTimeZone).replace(hour=0, minute=0, second=0, microsecond=0)


def periodStart(period: ScanPeriod) -> datetime | None:
    return startOfCurrentMonth() if period == ScanPeriod.month else None


def countSince(session: Session, model, user: User, since: datetime | None, *conditions) -> int:
    query = select(func.count()).select_from(model).where(model.userId == user.id, *conditions)
    if since is not None:
        query = query.where(model.createdAt >= since)
    return session.scalar(query)


def rewardedScans(session: Session, user: User, kind: RewardKind, period: ScanPeriod) -> int:
    return countSince(session, RewardedAdView, user, periodStart(period), RewardedAdView.kind == kind)


def usedReceiptScans(session: Session, user: User) -> int:
    return countSince(session, ReceiptScan, user, periodStart(limitsOf(user).receiptScanPeriod))


def receiptScanLimit(session: Session, user: User) -> int:
    limits = limitsOf(user)
    return limits.receiptScans + rewardedScans(session, user, RewardKind.receiptScan, limits.receiptScanPeriod)


def usedRecipeScans(session: Session, user: User) -> int:
    return countSince(session, RecipeScan, user, periodStart(limitsOf(user).recipeScanPeriod))


def recipeScanLimit(session: Session, user: User) -> int:
    limits = limitsOf(user)
    return limits.recipeScans + rewardedScans(session, user, RewardKind.recipeScan, limits.recipeScanPeriod)


def rewardedAdsToday(session: Session, user: User) -> int:
    return countSince(session, RewardedAdView, user, startOfToday())


def householdOwners(session: Session, householdId: int) -> list[User]:
    return list(
        session.scalars(
            select(User)
            .join(HouseholdMember, HouseholdMember.userId == User.id)
            .where(HouseholdMember.householdId == householdId, HouseholdMember.role == HouseholdRole.owner)
        )
    )


def householdLimits(session: Session, householdId: int) -> PlanLimits:
    owners = householdOwners(session, householdId)
    if not owners:
        return planLimits[Plan.free]
    return max((limitsOf(owner) for owner in owners), key=lambda limits: limits.householdMembers)


def householdMemberLimit(session: Session, householdId: int) -> int:
    return householdLimits(session, householdId).householdMembers


def householdMemberCount(session: Session, householdId: int) -> int:
    return session.scalar(
        select(func.count()).select_from(HouseholdMember).where(HouseholdMember.householdId == householdId)
    )


def storageLocationCount(session: Session, householdId: int) -> int:
    return session.scalar(
        select(func.count()).select_from(StorageLocation).where(StorageLocation.householdId == householdId)
    )


def householdIsLocked(session: Session, householdId: int) -> bool:
    return householdMemberCount(session, householdId) > householdMemberLimit(session, householdId)


def householdCount(session: Session, user: User) -> int:
    return session.scalar(select(func.count()).select_from(HouseholdMember).where(HouseholdMember.userId == user.id))
