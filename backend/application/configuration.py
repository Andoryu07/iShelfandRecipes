import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Configuration:
    databaseUrl: str
    jsonWebTokenSecret: str
    accessTokenLifetimeMinutes: int = 30
    refreshTokenLifetimeDays: int = 60
    refreshTokenCookieSecure: bool = True
    geminiApiKey: str | None = None
    geminiModel: str = "gemini-3.8-flash"
    geminiThinkingLevel: str = "minimal"
    geminiTimeoutSeconds: int = 60


@lru_cache
def getConfiguration() -> Configuration:
    return Configuration(
        databaseUrl=os.environ["DATABASE_URL"],
        jsonWebTokenSecret=os.environ["JWT_SECRET"],
        refreshTokenCookieSecure=os.environ.get("REFRESH_TOKEN_COOKIE_SECURE", "true").lower() != "false",
        geminiApiKey=os.environ.get("GEMINI_API_KEY") or None,
        geminiModel=os.environ.get("GEMINI_MODEL") or "gemini-3.8-flash",
        geminiThinkingLevel=os.environ.get("GEMINI_THINKING_LEVEL") or "minimal",
    )
