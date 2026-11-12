from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Numeric, Text, func, text
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base, databaseEnum, measurementUnitType
from application.models.enumerations import (
    MeasurementUnit,
    ReservationStatus,
    StockMovementReason,
    StorageLocationKind,
)


class StorageLocation(Base):
    __tablename__ = "storage_locations"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str]
    kind: Mapped[StorageLocationKind] = mapped_column(
        databaseEnum(StorageLocationKind, "storage_location_kind")
    )


class Food(Base):
    __tablename__ = "foods"
    __table_args__ = (Index("uq_foods_household_id_lower_name", "household_id", text("lower(name)"), unique=True),)

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE")
    )
    name: Mapped[str]
    genericName: Mapped[str | None] = mapped_column("generic_name")
    category: Mapped[str | None]
    baseUnit: Mapped[MeasurementUnit] = mapped_column(
        "base_unit", measurementUnitType
    )


class StockItem(Base):
    __tablename__ = "stock_items"
    __table_args__ = (CheckConstraint("quantity >= 0", name="quantity_not_negative"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    storageLocationId: Mapped[int] = mapped_column(
        "storage_location_id", ForeignKey("storage_locations.id", ondelete="CASCADE"), index=True
    )
    foodId: Mapped[int] = mapped_column("food_id", ForeignKey("foods.id", ondelete="CASCADE"), index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    expirationDate: Mapped[date | None] = mapped_column("expiration_date", index=True)
    receiptItemId: Mapped[int | None] = mapped_column(
        "receipt_item_id", ForeignKey("receipt_items.id", ondelete="SET NULL"), unique=True
    )
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (CheckConstraint("quantity_change <> 0", name="quantity_change_not_zero"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    stockItemId: Mapped[int] = mapped_column(
        "stock_item_id", ForeignKey("stock_items.id", ondelete="CASCADE"), index=True
    )
    userId: Mapped[int | None] = mapped_column("user_id", ForeignKey("users.id", ondelete="SET NULL"))
    quantityChange: Mapped[Decimal] = mapped_column("quantity_change", Numeric(12, 3))
    reason: Mapped[StockMovementReason] = mapped_column(
        databaseEnum(StockMovementReason, "stock_movement_reason")
    )
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class Reservation(Base):
    __tablename__ = "reservations"
    __table_args__ = (CheckConstraint("quantity > 0", name="quantity_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    stockItemId: Mapped[int] = mapped_column(
        "stock_item_id", ForeignKey("stock_items.id", ondelete="CASCADE"), index=True
    )
    userId: Mapped[int] = mapped_column("user_id", ForeignKey("users.id", ondelete="CASCADE"), index=True)
    recipeId: Mapped[int | None] = mapped_column("recipe_id", ForeignKey("recipes.id", ondelete="SET NULL"))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    note: Mapped[str | None] = mapped_column(Text)
    status: Mapped[ReservationStatus] = mapped_column(
        databaseEnum(ReservationStatus, "reservation_status"), default=ReservationStatus.active
    )
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )
