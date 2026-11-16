import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from application.authentication import (
    deleteRefreshTokenCookie,
    findRefreshToken,
    issueTokens,
    refreshTokenCookieName,
    revokeAllRefreshTokens,
)
from application.configuration import getConfiguration
from application.database import getDatabaseSession
from application.emails.messages import accountDeletionEmail, passwordChangedEmail, passwordResetEmail
from application.emails.sending import EmailSender, getEmailSender, sendSafely
from application.passwords import createPasswordResetToken, findUsablePasswordResetToken, setNewPassword
from application.accounts import deleteAccountNow, requestAccountDeletion, scheduledDeletionTime
from application.dependencies import getCurrentUser, getCurrentUserEvenIfPendingDeletion
from application.models import User
from application.routers.households import createHouseholdWithDefaults
from application.schemas.authentication import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    GuestRequest,
    LoginRequest,
    PasswordResetConfirmation,
    PasswordResetRequest,
    RegisterRequest,
    TokenResponse,
    UpgradeGuestRequest,
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
    user = session.scalar(select(User).where(User.email == request.email.lower(), User.isGuest.is_(False)))
    passwordHash = user.passwordHash if user else placeholderPasswordHash
    passwordMatches = verifyPassword(request.password, passwordHash)
    if user is None or not passwordMatches:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    return issueTokens(session, user, response)


guestDisplayName = "Host"
guestsPerAddressPerDay = 5


def hashClientAddress(request: Request) -> str:
    address = request.client.host if request.client else "unknown"
    return hashlib.sha256(f"{getConfiguration().jsonWebTokenSecret}:{address}".encode()).hexdigest()


@router.post("/guest", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def startAsGuest(
    body: GuestRequest, request: Request, response: Response, session: Session = Depends(getDatabaseSession)
) -> TokenResponse:
    addressHash = hashClientAddress(request)
    recentGuests = session.scalar(
        select(func.count())
        .select_from(User)
        .where(User.guestAddressHash == addressHash, User.createdAt >= datetime.now(timezone.utc) - timedelta(days=1))
    )
    if recentGuests >= guestsPerAddressPerDay:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many guest accounts")
    user = User(
        email=f"guest-{secrets.token_hex(12)}@guest.invalid",
        passwordHash=hashPassword(secrets.token_urlsafe(32)),
        displayName=guestDisplayName,
        isGuest=True,
        guestAddressHash=addressHash,
    )
    session.add(user)
    session.flush()
    createHouseholdWithDefaults(session, user, body.householdName)
    return issueTokens(session, user, response)


@router.post("/me/upgrade", response_model=UserResponse)
def upgradeGuest(
    request: UpgradeGuestRequest, user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> UserResponse:
    if not user.isGuest:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="The account is not a guest account")
    user.email = request.email.lower()
    user.passwordHash = hashPassword(request.password)
    user.displayName = request.displayName
    user.isGuest = False
    user.guestAddressHash = None
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")
    return buildUserResponse(user)


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


@router.post("/password-reset/request", status_code=status.HTTP_202_ACCEPTED)
def requestPasswordReset(
    request: PasswordResetRequest,
    backgroundTasks: BackgroundTasks,
    session: Session = Depends(getDatabaseSession),
    emailSender: EmailSender = Depends(getEmailSender),
) -> None:
    user = session.scalar(select(User).where(User.email == request.email.lower(), User.isGuest.is_(False)))
    token = createPasswordResetToken(session, user) if user else None
    if user is None or token is None:
        return
    session.commit()
    resetUrl = f"{getConfiguration().applicationUrl}/reset-password#token={token}"
    backgroundTasks.add_task(sendSafely, emailSender, passwordResetEmail(user.email, resetUrl))


@router.post("/password-reset/confirm", status_code=status.HTTP_204_NO_CONTENT)
def confirmPasswordReset(
    request: PasswordResetConfirmation,
    backgroundTasks: BackgroundTasks,
    session: Session = Depends(getDatabaseSession),
    emailSender: EmailSender = Depends(getEmailSender),
) -> Response:
    storedToken = findUsablePasswordResetToken(session, request.token)
    if storedToken is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")
    user = session.get(User, storedToken.userId)
    setNewPassword(session, user, request.newPassword)
    session.commit()
    backgroundTasks.add_task(
        sendSafely, emailSender, passwordChangedEmail(user.email, getConfiguration().applicationUrl)
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/me/password", response_model=TokenResponse)
def changePassword(
    request: ChangePasswordRequest,
    response: Response,
    backgroundTasks: BackgroundTasks,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
    emailSender: EmailSender = Depends(getEmailSender),
) -> TokenResponse:
    if user.isGuest or not verifyPassword(request.currentPassword, user.passwordHash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password")
    setNewPassword(session, user, request.newPassword)
    backgroundTasks.add_task(
        sendSafely, emailSender, passwordChangedEmail(user.email, getConfiguration().applicationUrl)
    )
    return issueTokens(session, user, response)


def buildUserResponse(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        email=None if user.isGuest else user.email,
        isGuest=user.isGuest,
        displayName=user.displayName,
        receiptConsentGivenAt=user.receiptConsentGivenAt,
        recipePhotoConsentGivenAt=user.recipePhotoConsentGivenAt,
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
    backgroundTasks: BackgroundTasks,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
    emailSender: EmailSender = Depends(getEmailSender),
) -> Response:
    if user.isGuest:
        deleteAccountNow(session, user)
        session.commit()
        response = Response(status_code=status.HTTP_204_NO_CONTENT)
        deleteRefreshTokenCookie(response)
        return response
    if not verifyPassword(request.password, user.passwordHash):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Incorrect password")
    requestAccountDeletion(session, user)
    session.commit()
    backgroundTasks.add_task(
        sendSafely,
        emailSender,
        accountDeletionEmail(user.email, scheduledDeletionTime(user), getConfiguration().applicationUrl),
    )
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    deleteRefreshTokenCookie(response)
    return response


@router.delete("/me/receipt-consent", response_model=UserResponse)
def withdrawReceiptConsent(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> UserResponse:
    user.receiptConsentGivenAt = None
    user.recipePhotoConsentGivenAt = None
    session.commit()
    return buildUserResponse(user)


@router.post("/me/receipt-consent", response_model=UserResponse)
def givePhotoConsent(
    user: User = Depends(getCurrentUser), session: Session = Depends(getDatabaseSession)
) -> UserResponse:
    now = datetime.now(timezone.utc)
    user.receiptConsentGivenAt = user.receiptConsentGivenAt or now
    user.recipePhotoConsentGivenAt = user.recipePhotoConsentGivenAt or now
    session.commit()
    return buildUserResponse(user)
