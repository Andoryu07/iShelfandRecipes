import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from application.authentication import revokeAllRefreshTokens
from application.models import PasswordResetToken, User
from application.security import hashPassword, hashRefreshToken

resetTokenLifetime = timedelta(hours=1)
maximumResetRequestsPerHour = 3


def createPasswordResetToken(session: Session, user: User) -> str | None:
    now = datetime.now(timezone.utc)
    recentRequests = session.scalar(
        select(func.count())
        .select_from(PasswordResetToken)
        .where(PasswordResetToken.userId == user.id, PasswordResetToken.createdAt > now - timedelta(hours=1))
    )
    if recentRequests >= maximumResetRequestsPerHour:
        return None
    token = secrets.token_urlsafe(32)
    session.add(PasswordResetToken(userId=user.id, tokenHash=hashRefreshToken(token), expiresAt=now + resetTokenLifetime))
    return token


def findUsablePasswordResetToken(session: Session, token: str) -> PasswordResetToken | None:
    storedToken = session.scalar(
        select(PasswordResetToken).where(PasswordResetToken.tokenHash == hashRefreshToken(token)).with_for_update()
    )
    if storedToken is None or storedToken.usedAt is not None:
        return None
    if storedToken.expiresAt <= datetime.now(timezone.utc):
        return None
    return storedToken


def setNewPassword(session: Session, user: User, newPassword: str) -> None:
    user.passwordHash = hashPassword(newPassword)
    session.execute(
        update(PasswordResetToken)
        .where(PasswordResetToken.userId == user.id, PasswordResetToken.usedAt.is_(None))
        .values(usedAt=datetime.now(timezone.utc))
    )
    revokeAllRefreshTokens(session, user.id)
