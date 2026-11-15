from datetime import date, datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base, databaseEnum
from application.models.enumerations import HouseholdRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True)
    passwordHash: Mapped[str] = mapped_column("password_hash")
    displayName: Mapped[str] = mapped_column("display_name")
    receiptConsentGivenAt: Mapped[datetime | None] = mapped_column(
        "receipt_consent_given_at", DateTime(timezone=True)
    )
    deletionRequestedAt: Mapped[datetime | None] = mapped_column("deletion_requested_at", DateTime(timezone=True))
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class Household(Base):
    __tablename__ = "households"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    inviteCode: Mapped[str] = mapped_column("invite_code", unique=True)
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class HouseholdMember(Base):
    __tablename__ = "household_members"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_household_members_user_id_single_household"),
        CheckConstraint("notification_hour BETWEEN 0 AND 23", name="notification_hour_valid"),
        CheckConstraint("expiration_warning_days BETWEEN 0 AND 14", name="expiration_warning_days_valid"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    userId: Mapped[int] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE"))
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[HouseholdRole] = mapped_column(databaseEnum(HouseholdRole, "household_role"))
    notificationHour: Mapped[int] = mapped_column("notification_hour", default=8, server_default="8")
    expirationWarningDays: Mapped[int] = mapped_column(
        "expiration_warning_days", default=2, server_default="2"
    )
    expirationNotifiedOn: Mapped[date | None] = mapped_column("expiration_notified_on")
    joinedAt: Mapped[datetime] = mapped_column(
        "joined_at", DateTime(timezone=True), server_default=func.now()
    )
