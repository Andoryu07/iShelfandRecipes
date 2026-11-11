from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    userId: Mapped[int] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE"), index=True)
    tokenHash: Mapped[str] = mapped_column("token_hash", unique=True)
    expiresAt: Mapped[datetime] = mapped_column("expires_at", DateTime(timezone=True))
    revokedAt: Mapped[datetime | None] = mapped_column("revoked_at", DateTime(timezone=True))
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )
