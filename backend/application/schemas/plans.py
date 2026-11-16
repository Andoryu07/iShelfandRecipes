from datetime import datetime

from pydantic import BaseModel

from application.models.enumerations import RewardKind
from application.plans import Plan, ScanPeriod


class ScanAllowance(BaseModel):
    used: int
    limit: int
    period: ScanPeriod


class PlanResponse(BaseModel):
    plan: Plan
    premiumUntil: datetime | None
    testActivationAvailable: bool
    receiptScans: ScanAllowance
    recipeScans: ScanAllowance
    householdCount: int
    householdLimit: int
    householdMemberLimit: int
    storageLocationLimit: int
    spendingMonths: int | None
    canShareHousehold: bool
    canUploadFoodPhotos: bool
    showsAds: bool
    rewardedAdsLeftToday: int


class RewardedAdRequest(BaseModel):
    kind: RewardKind
