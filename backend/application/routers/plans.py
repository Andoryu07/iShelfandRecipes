from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.database import getDatabaseSession
from application.dependencies import getCurrentUser
from application.models import RewardedAdView, User
from application.plans import (
    Plan,
    householdCount,
    limitsOf,
    planOf,
    receiptScanLimit,
    recipeScanLimit,
    rewardedAdsPerDay,
    rewardedAdsToday,
    usedReceiptScans,
    usedRecipeScans,
)
from application.schemas.plans import PlanResponse, RewardedAdRequest, ScanAllowance

router = APIRouter(prefix="/auth/me", tags=["plans"])
testPremiumDays = 30


def rewardedAdsLeftToday(session: Session, user: User) -> int:
    if not getConfiguration().adsEnabled or not limitsOf(user).canWatchRewardedAds:
        return 0
    return max(0, rewardedAdsPerDay - rewardedAdsToday(session, user))


def buildPlanResponse(session: Session, user: User) -> PlanResponse:
    limits = limitsOf(user)
    plan = planOf(user)
    return PlanResponse(
        plan=plan,
        premiumUntil=user.premiumUntil if plan == Plan.premium else None,
        testActivationAvailable=getConfiguration().premiumTestActivation and not user.isGuest,
        receiptScans=ScanAllowance(
            used=usedReceiptScans(session, user),
            limit=receiptScanLimit(session, user),
            period=limits.receiptScanPeriod,
        ),
        recipeScans=ScanAllowance(
            used=usedRecipeScans(session, user), limit=recipeScanLimit(session, user), period=limits.recipeScanPeriod
        ),
        householdCount=householdCount(session, user),
        householdLimit=limits.households,
        householdMemberLimit=limits.householdMembers,
        storageLocationLimit=limits.storageLocations,
        spendingMonths=limits.spendingMonths,
        canShareHousehold=limits.canShareHousehold,
        canUploadFoodPhotos=limits.canUploadFoodPhotos,
        showsAds=limits.showsAds and getConfiguration().adsEnabled,
        rewardedAdsLeftToday=rewardedAdsLeftToday(session, user),
    )


@router.get("/plan", response_model=PlanResponse)
def getPlan(user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)) -> PlanResponse:
    return buildPlanResponse(session, user)


def ensureTestActivationIsAvailable(user: User) -> None:
    if not getConfiguration().premiumTestActivation or user.isGuest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test activation is not available")


@router.post("/premium/test-activation", response_model=PlanResponse)
def activateTestPremium(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> PlanResponse:
    ensureTestActivationIsAvailable(user)
    user.premiumUntil = datetime.now(timezone.utc) + timedelta(days=testPremiumDays)
    session.commit()
    return buildPlanResponse(session, user)


@router.delete("/premium/test-activation", response_model=PlanResponse)
def cancelTestPremium(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> PlanResponse:
    ensureTestActivationIsAvailable(user)
    user.premiumUntil = None
    session.commit()
    return buildPlanResponse(session, user)


@router.post("/rewarded-ads", response_model=PlanResponse)
def recordRewardedAd(
    request: RewardedAdRequest, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> PlanResponse:
    if rewardedAdsLeftToday(session, user) <= 0:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="No more rewarded ads today")
    session.add(RewardedAdView(userId=user.id, kind=request.kind))
    session.commit()
    return buildPlanResponse(session, user)
