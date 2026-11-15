from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base


class ShoppingListItem(Base):
    __tablename__ = "shopping_list_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    ownerUserId: Mapped[int | None] = mapped_column(
        "owner_user_id", ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    foodId: Mapped[int | None] = mapped_column("food_id", ForeignKey("foods.id", ondelete="SET NULL"))
    name: Mapped[str]
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    note: Mapped[str | None]
    recipeId: Mapped[int | None] = mapped_column("recipe_id", ForeignKey("recipes.id", ondelete="SET NULL"))
    createdByUserId: Mapped[int | None] = mapped_column(
        "created_by_user_id", ForeignKey("users.id", ondelete="SET NULL")
    )
    checkedAt: Mapped[datetime | None] = mapped_column("checked_at", DateTime(timezone=True))
    checkedByUserId: Mapped[int | None] = mapped_column(
        "checked_by_user_id", ForeignKey("users.id", ondelete="SET NULL")
    )
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )
