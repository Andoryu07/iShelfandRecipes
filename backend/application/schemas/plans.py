from datetime import datetime

from pydantic import BaseModel

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
    householdMemberLimit: int
    spendingMonths: int | None
