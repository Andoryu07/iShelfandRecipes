from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getHouseholdMembership
from application.models import HouseholdMember
from application.schemas.statistics import SpendingResponse
from application.statistics import spendingFor
from application.stock import todayInHouseholdTimeZone

router = APIRouter(tags=["statistics"])


@router.get("/households/{householdId}/statistics/spending", response_model=SpendingResponse)
def getSpending(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    months: int = Query(default=6, ge=1, le=24),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> SpendingResponse:
    if month is None:
        today = todayInHouseholdTimeZone()
        selectedMonth = date(today.year, today.month, 1)
    else:
        year, monthNumber = int(month[:4]), int(month[5:])
        if not 1 <= monthNumber <= 12:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid month")
        selectedMonth = date(year, monthNumber, 1)
    return spendingFor(session, membership.householdId, selectedMonth, months)
