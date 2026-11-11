from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.authentication import findRefreshToken, issueTokens, revokeAllRefreshTokens
from application.database import getDatabaseSession
from application.dependencies import getCurrentUser
from application.models import User
from application.schemas.authentication import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from application.security import hashPassword, placeholderPasswordHash, verifyPassword

router = APIRouter(prefix="/auth", tags=["authentication"])


def invalidRefreshTokenError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest, session: Session = Depends(getDatabaseSession)) -> TokenResponse:
    user = User(
        email=request.email.lower(),
        passwordHash=hashPassword(request.password),
        displayName=request.displayName,
    )
    session.add(user)
    try:
        session.flush()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    return issueTokens(session, user)


@router.post("/login", response_model=TokenResponse)
def login(request: LoginRequest, session: Session = Depends(getDatabaseSession)) -> TokenResponse:
    user = session.scalar(select(User).where(User.email == request.email.lower()))
    passwordHash = user.passwordHash if user else placeholderPasswordHash
    passwordMatches = verifyPassword(request.password, passwordHash)
    if user is None or not passwordMatches:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return issueTokens(session, user)


@router.post("/refresh", response_model=TokenResponse)
def refresh(request: RefreshRequest, session: Session = Depends(getDatabaseSession)) -> TokenResponse:
    storedToken = findRefreshToken(session, request.refreshToken)
    if storedToken is None:
        raise invalidRefreshTokenError()
    if storedToken.revokedAt is not None:
        revokeAllRefreshTokens(session, storedToken.userId)
        session.commit()
        raise invalidRefreshTokenError()
    if storedToken.expiresAt <= datetime.now(timezone.utc):
        raise invalidRefreshTokenError()
    storedToken.revokedAt = datetime.now(timezone.utc)
    user = session.get(User, storedToken.userId)
    return issueTokens(session, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: RefreshRequest, session: Session = Depends(getDatabaseSession)) -> Response:
    storedToken = findRefreshToken(session, request.refreshToken)
    if storedToken is not None and storedToken.revokedAt is None:
        storedToken.revokedAt = datetime.now(timezone.utc)
        session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=UserResponse)
def getMe(user: User = Depends(getCurrentUser)) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, displayName=user.displayName)
