from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.households import findMembership
from application.models import HouseholdMember, User
from application.models.enumerations import HouseholdRole
from application.security import decodeAccessToken

bearerScheme = HTTPBearer(auto_error=False)


def getCurrentUser(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearerScheme),
    session: Session = Depends(getDatabaseSession),
) -> User:
    userId = decodeAccessToken(credentials.credentials) if credentials else None
    user = session.get(User, userId) if userId is not None else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def getHouseholdMembership(
    householdId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> HouseholdMember:
    membership = findMembership(session, user.id, householdId)
    if membership is None:
        raise householdNotFoundError()
    return membership


def getHouseholdOwnership(membership: HouseholdMember = Depends(getHouseholdMembership)) -> HouseholdMember:
    if membership.role != HouseholdRole.owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the household owner can do this")
    return membership


def householdNotFoundError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Household not found")
