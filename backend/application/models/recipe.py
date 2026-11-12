from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, Text, UniqueConstraint, false, func, true
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base


class Recipe(Base):
    __tablename__ = "recipes"
    __table_args__ = (CheckConstraint("servings > 0", name="servings_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str]
    instructions: Mapped[str] = mapped_column(Text)
    servings: Mapped[int]
    preparationMinutes: Mapped[int | None] = mapped_column("preparation_minutes")
    isPredefined: Mapped[bool] = mapped_column("is_predefined", default=False, server_default=false())
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class RecipeIngredient(Base):
    __tablename__ = "recipe_ingredients"
    __table_args__ = (
        UniqueConstraint("recipe_id", "food_id"),
        CheckConstraint("quantity > 0", name="quantity_positive"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    recipeId: Mapped[int] = mapped_column("recipe_id", ForeignKey("recipes.id", ondelete="CASCADE"))
    foodId: Mapped[int] = mapped_column("food_id", ForeignKey("foods.id", ondelete="CASCADE"), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    acceptsAnyOfKind: Mapped[bool] = mapped_column("accepts_any_of_kind", default=True, server_default=true())
    isOptional: Mapped[bool] = mapped_column("is_optional", default=False, server_default=false())
