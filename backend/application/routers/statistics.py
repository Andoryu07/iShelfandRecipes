from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership
from application.models import HouseholdMember, User
from application.plans import Plan, limitsOf, planOf
from application.schemas.statistics import SpendingResponse, UnhealthySpendingResponse
from application.statistics import spendingFor, unhealthySpendingFor
from application.stock import todayInHouseholdTimeZone

router = APIRouter(tags=["statistics"])


@router.get("/households/{householdId}/statistics/spending", response_model=SpendingResponse)
def getSpending(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    months: int = Query(default=6, ge=1, le=24),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> SpendingResponse:
    today = todayInHouseholdTimeZone()
    currentMonthIndex = today.year * 12 + today.month - 1
    if month is None:
        selectedMonth = date(today.year, today.month, 1)
    else:
        year, monthNumber = int(month[:4]), int(month[5:])
        if not 1 <= monthNumber <= 12:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid month")
        selectedMonth = date(year, monthNumber, 1)
    allowedMonths = limitsOf(user).spendingMonths
    if allowedMonths is not None:
        monthsBack = currentMonthIndex - (selectedMonth.year * 12 + selectedMonth.month - 1)
        if monthsBack >= allowedMonths:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Older spending needs premium")
        months = max(1, min(months, allowedMonths - max(monthsBack, 0)))
    return spendingFor(session, membership.householdId, selectedMonth, months)


@router.get("/households/{householdId}/statistics/unhealthy-spending", response_model=UnhealthySpendingResponse)
def getUnhealthySpending(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    months: int = Query(default=6, ge=1, le=24),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> UnhealthySpendingResponse:
    if planOf(user) != Plan.premium:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unhealthy spending needs premium")
    today = todayInHouseholdTimeZone()
    selectedMonth = date(today.year, today.month, 1)
    if month is not None:
        year, monthNumber = int(month[:4]), int(month[5:])
        if not 1 <= monthNumber <= 12:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid month")
        selectedMonth = date(year, monthNumber, 1)
    return unhealthySpendingFor(session, membership.householdId, selectedMonth, months)
