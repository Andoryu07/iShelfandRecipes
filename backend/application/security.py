import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from application.configuration import getConfiguration

passwordHasher = PasswordHasher()
jsonWebTokenAlgorithm = "HS256"
placeholderPasswordHash = passwordHasher.hash("placeholder password for timing")


def hashPassword(password: str) -> str:
    return passwordHasher.hash(password)


def verifyPassword(password: str, passwordHash: str) -> bool:
    try:
        return passwordHasher.verify(passwordHash, password)
    except (VerificationError, InvalidHashError):
        return False


def createAccessToken(userId: int) -> str:
    configuration = getConfiguration()
    expiresAt = datetime.now(timezone.utc) + timedelta(minutes=configuration.accessTokenLifetimeMinutes)
    payload = {"sub": str(userId), "exp": expiresAt}
    return jwt.encode(payload, configuration.jsonWebTokenSecret, algorithm=jsonWebTokenAlgorithm)


def decodeAccessToken(token: str) -> int | None:
    try:
        payload = jwt.decode(
            token,
            getConfiguration().jsonWebTokenSecret,
            algorithms=[jsonWebTokenAlgorithm],
            options={"require": ["sub", "exp"]},
        )
        return int(payload["sub"])
    except (jwt.PyJWTError, ValueError):
        return None


def generateRefreshToken() -> str:
    return secrets.token_urlsafe(48)


def hashRefreshToken(refreshToken: str) -> str:
    return hashlib.sha256(refreshToken.encode()).hexdigest()
