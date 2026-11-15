from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base


class JoinRequest(Base):
    __tablename__ = "join_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    userId: Mapped[int] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE"), unique=True)
    rejectedAt: Mapped[datetime | None] = mapped_column("rejected_at", DateTime(timezone=True))
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class InviteLink(Base):
    __tablename__ = "invite_links"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    tokenHash: Mapped[str] = mapped_column("token_hash", unique=True)
    createdByUserId: Mapped[int | None] = mapped_column(
        "created_by_user_id", ForeignKey("users.id", ondelete="SET NULL")
    )
    expiresAt: Mapped[datetime] = mapped_column("expires_at", DateTime(timezone=True))
    usedAt: Mapped[datetime | None] = mapped_column("used_at", DateTime(timezone=True))
    usedByUserId: Mapped[int | None] = mapped_column("used_by_user_id", ForeignKey("users.id", ondelete="SET NULL"))
    revokedAt: Mapped[datetime | None] = mapped_column("revoked_at", DateTime(timezone=True))
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )
