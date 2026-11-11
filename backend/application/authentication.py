from datetime import datetime, timedelta, timezone

from fastapi import Response
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.models import RefreshToken, User
from application.schemas.authentication import TokenResponse
from application.security import createAccessToken, generateRefreshToken, hashRefreshToken


refreshTokenCookieName = "refreshToken"


def setRefreshTokenCookie(response: Response, refreshToken: str) -> None:
    configuration = getConfiguration()
    response.set_cookie(
        refreshTokenCookieName,
        refreshToken,
        max_age=configuration.refreshTokenLifetimeDays * 24 * 60 * 60,
        httponly=True,
        secure=configuration.refreshTokenCookieSecure,
        samesite="strict",
    )


def deleteRefreshTokenCookie(response: Response) -> None:
    response.delete_cookie(
        refreshTokenCookieName,
        httponly=True,
        secure=getConfiguration().refreshTokenCookieSecure,
        samesite="strict",
    )


def issueTokens(session: Session, user: User, response: Response) -> TokenResponse:
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
    setRefreshTokenCookie(response, refreshToken)
    return TokenResponse(
        accessToken=createAccessToken(user.id),
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
