from datetime import datetime, timezone

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.authentication import (
    deleteRefreshTokenCookie,
    findRefreshToken,
    issueTokens,
    refreshTokenCookieName,
    revokeAllRefreshTokens,
)
from application.database import getDatabaseSession
from application.accounts import requestAccountDeletion, scheduledDeletionTime
from application.dependencies import getCurrentUser, getCurrentUserEvenIfPendingDeletion
from application.models import User
from application.schemas.authentication import (
    DeleteAccountRequest,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from application.security import hashPassword, placeholderPasswordHash, verifyPassword

router = APIRouter(prefix="/auth", tags=["authentication"])


def invalidRefreshTokenError() -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    request: RegisterRequest, response: Response, session: Session = Depends(getDatabaseSession)
) -> TokenResponse:
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
    return issueTokens(session, user, response)


@router.post("/login", response_model=TokenResponse)
def login(
    request: LoginRequest, response: Response, session: Session = Depends(getDatabaseSession)
) -> TokenResponse:
    user = session.scalar(select(User).where(User.email == request.email.lower()))
    passwordHash = user.passwordHash if user else placeholderPasswordHash
    passwordMatches = verifyPassword(request.password, passwordHash)
    if user is None or not passwordMatches:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return issueTokens(session, user, response)


RefreshTokenCookie = Cookie(default=None, alias=refreshTokenCookieName)


@router.post("/refresh", response_model=TokenResponse)
def refresh(
    response: Response,
    refreshToken: str | None = RefreshTokenCookie,
    session: Session = Depends(getDatabaseSession),
) -> TokenResponse:
    storedToken = findRefreshToken(session, refreshToken) if refreshToken else None
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
    return issueTokens(session, user, response)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    refreshToken: str | None = RefreshTokenCookie, session: Session = Depends(getDatabaseSession)
) -> Response:
    storedToken = findRefreshToken(session, refreshToken) if refreshToken else None
    if storedToken is not None and storedToken.revokedAt is None:
        storedToken.revokedAt = datetime.now(timezone.utc)
        session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    deleteRefreshTokenCookie(response)
    return response


def buildUserResponse(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=user.email,
        displayName=user.displayName,
        receiptConsentGivenAt=user.receiptConsentGivenAt,
        deletionScheduledAt=scheduledDeletionTime(user),
    )


@router.get("/me", response_model=UserResponse)
def getMe(user: User = Depends(getCurrentUserEvenIfPendingDeletion)) -> UserResponse:
    return buildUserResponse(user)


@router.post("/me/restore", response_model=UserResponse)
def restoreAccount(
    user: User = Depends(getCurrentUserEvenIfPendingDeletion), session: Session = Depends(getDatabaseSession)
) -> UserResponse:
    user.deletionRequestedAt = None
    session.commit()
    return buildUserResponse(user)


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def deleteAccount(
    request: DeleteAccountRequest,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    if not verifyPassword(request.password, user.passwordHash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password")
    requestAccountDeletion(session, user)
    session.commit()
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    deleteRefreshTokenCookie(response)
    return response


@router.delete("/me/receipt-consent", response_model=UserResponse)
def withdrawReceiptConsent(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> UserResponse:
    user.receiptConsentGivenAt = None
    session.commit()
    return buildUserResponse(user)


@router.post("/me/receipt-consent", response_model=UserResponse)
def giveReceiptConsent(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> UserResponse:
    if user.receiptConsentGivenAt is None:
        user.receiptConsentGivenAt = datetime.now(timezone.utc)
        session.commit()
    return buildUserResponse(user)
