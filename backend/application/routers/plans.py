from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.database import getDatabaseSession
from application.dependencies import getCurrentUser
from application.models import User
from application.plans import ScanPeriod, limitsOf, planOf, usedReceiptScans, usedRecipeScans
from application.schemas.plans import PlanResponse, ScanAllowance

router = APIRouter(prefix="/auth/me", tags=["plans"])
testPremiumDays = 30


def buildPlanResponse(session: Session, user: User) -> PlanResponse:
    limits = limitsOf(user)
    return PlanResponse(
        plan=planOf(user),
        premiumUntil=user.premiumUntil if user.premiumUntil and user.premiumUntil > datetime.now(timezone.utc) else None,
        testActivationAvailable=getConfiguration().premiumTestActivation,
        receiptScans=ScanAllowance(
            used=usedReceiptScans(session, user), limit=limits.receiptScansPerMonth, period=ScanPeriod.month
        ),
        recipeScans=ScanAllowance(
            used=usedRecipeScans(session, user), limit=limits.recipeScans, period=limits.recipeScanPeriod
        ),
        householdMemberLimit=limits.householdMembers,
        spendingMonths=limits.spendingMonths,
    )


@router.get("/plan", response_model=PlanResponse)
def getPlan(user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)) -> PlanResponse:
    return buildPlanResponse(session, user)


def ensureTestActivationIsAvailable() -> None:
    if not getConfiguration().premiumTestActivation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test activation is not available")


@router.post("/premium/test-activation", response_model=PlanResponse)
def activateTestPremium(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> PlanResponse:
    ensureTestActivationIsAvailable()
    user.premiumUntil = datetime.now(timezone.utc) + timedelta(days=testPremiumDays)
    session.commit()
    return buildPlanResponse(session, user)


@router.delete("/premium/test-activation", response_model=PlanResponse)
def cancelTestPremium(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> PlanResponse:
    ensureTestActivationIsAvailable()
    user.premiumUntil = None
    session.commit()
    return buildPlanResponse(session, user)
