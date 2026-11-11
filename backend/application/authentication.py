from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.models import RefreshToken, User
from application.schemas.authentication import TokenResponse
from application.security import createAccessToken, generateRefreshToken, hashRefreshToken


def issueTokens(session: Session, user: User) -> TokenResponse:
    configuration = getConfiguration()
    refreshToken = generateRefreshToken()
    session.add(
        RefreshToken(
            userId=user.id,
            tokenHash=hashRefreshToken(refreshToken),
            expiresAt=datetime.now(timezone.utc) + timedelta(days=configuration.refreshTokenLifetimeDays),
        )
    )
    session.commit()
    return TokenResponse(
        accessToken=createAccessToken(user.id),
        refreshToken=refreshToken,
        accessTokenExpiresInSeconds=configuration.accessTokenLifetimeMinutes * 60,
    )


def revokeAllRefreshTokens(session: Session, userId: int) -> None:
    session.execute(
        update(RefreshToken)
        .where(RefreshToken.userId == userId, RefreshToken.revokedAt.is_(None))
        .values(revokedAt=datetime.now(timezone.utc))
    )


def findRefreshToken(session: Session, refreshToken: str) -> RefreshToken | None:
    return session.scalar(
        select(RefreshToken).where(RefreshToken.tokenHash == hashRefreshToken(refreshToken))
    )
