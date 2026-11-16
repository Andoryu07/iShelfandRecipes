from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base, databaseEnum
from application.models.enumerations import RewardKind


class RewardedAdView(Base):
    __tablename__ = "rewarded_ad_views"

    id: Mapped[int] = mapped_column(primary_key=True)
    userId: Mapped[int] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE"), index=True)
    kind: Mapped[RewardKind] = mapped_column(databaseEnum(RewardKind, "reward_kind"))
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )
