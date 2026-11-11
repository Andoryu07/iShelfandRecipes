from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.models import User
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
