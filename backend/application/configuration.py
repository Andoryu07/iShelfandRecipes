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
    geminiThinkingLevel: str = "low"
    geminiTimeoutSeconds: int = 60
    vapidPublicKey: str | None = None
    vapidPrivateKey: str | None = None
    vapidSubject: str = "mailto:admin@example.com"
    smtpHost: str | None = None
    smtpPort: int = 587
    smtpUsername: str | None = None
    smtpPassword: str | None = None
    emailFrom: str = "iShelf <noreply@ishelf.cz>"
    emailReplyTo: str | None = None
    applicationUrl: str = "http://localhost:5173"


@lru_cache
def getConfiguration() -> Configuration:
    return Configuration(
        databaseUrl=os.environ["DATABASE_URL"],
        jsonWebTokenSecret=os.environ["JWT_SECRET"],
        refreshTokenCookieSecure=os.environ.get("REFRESH_TOKEN_COOKIE_SECURE", "true").lower() != "false",
        geminiApiKey=os.environ.get("GEMINI_API_KEY") or None,
        geminiModel=os.environ.get("GEMINI_MODEL") or "gemini-3.8-flash",
        geminiThinkingLevel=os.environ.get("GEMINI_THINKING_LEVEL") or "low",
        vapidPublicKey=os.environ.get("VAPID_PUBLIC_KEY") or None,
        vapidPrivateKey=os.environ.get("VAPID_PRIVATE_KEY") or None,
        vapidSubject=os.environ.get("VAPID_SUBJECT") or "mailto:admin@example.com",
        smtpHost=os.environ.get("SMTP_HOST") or None,
        smtpPort=int(os.environ.get("SMTP_PORT") or 587),
        smtpUsername=os.environ.get("SMTP_USERNAME") or None,
        smtpPassword=os.environ.get("SMTP_PASSWORD") or None,
        emailFrom=os.environ.get("EMAIL_FROM") or "iShelf <noreply@ishelf.cz>",
        emailReplyTo=os.environ.get("EMAIL_REPLY_TO") or None,
        applicationUrl=(os.environ.get("APPLICATION_URL") or "http://localhost:5173").rstrip("/"),
    )
