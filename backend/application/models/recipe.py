from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, Text, UniqueConstraint, false, func, true
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base, databaseEnum
from application.models.enumerations import DishType


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
    dishType: Mapped[DishType | None] = mapped_column("dish_type", databaseEnum(DishType, "dish_type"))
    isVegetarian: Mapped[bool] = mapped_column("is_vegetarian", default=False, server_default=false())
    icon: Mapped[str | None]
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
    isForFrying: Mapped[bool] = mapped_column("is_for_frying", default=False, server_default=false())


class RecipeCooking(Base):
    __tablename__ = "recipe_cookings"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    recipeId: Mapped[int | None] = mapped_column(
        "recipe_id", ForeignKey("recipes.id", ondelete="SET NULL"), index=True
    )
    recipeName: Mapped[str] = mapped_column("recipe_name")
    userId: Mapped[int | None] = mapped_column("user_id", ForeignKey("users.id", ondelete="SET NULL"))
    servings: Mapped[int]
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class FavouriteRecipe(Base):
    __tablename__ = "favourite_recipes"

    userId: Mapped[int] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    recipeId: Mapped[int] = mapped_column(
        "recipe_id", ForeignKey("recipes.id", ondelete="CASCADE"), primary_key=True, index=True
    )
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class RecipeScan(Base):
    __tablename__ = "recipe_scans"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    userId: Mapped[int | None] = mapped_column("user_id", ForeignKey("users.id", ondelete="SET NULL"))
    photoCount: Mapped[int] = mapped_column("photo_count")
    processingMilliseconds: Mapped[int | None] = mapped_column("processing_milliseconds")
    inputTokens: Mapped[int | None] = mapped_column("input_tokens")
    outputTokens: Mapped[int | None] = mapped_column("output_tokens")
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )
