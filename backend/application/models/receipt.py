from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, Text, UniqueConstraint, false, func
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base, databaseEnum, measurementUnitType
from application.models.enumerations import MeasurementUnit, UnhealthyKind


class Receipt(Base):
    __tablename__ = "receipts"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    userId: Mapped[int | None] = mapped_column("user_id", ForeignKey("users.id", ondelete="SET NULL"))
    storeName: Mapped[str | None] = mapped_column("store_name")
    purchasedOn: Mapped[date] = mapped_column("purchased_on")
    totalAmount: Mapped[Decimal] = mapped_column("total_amount", Numeric(12, 2))
    itemsSumMatchesTotal: Mapped[bool] = mapped_column("items_sum_matches_total")
    processingMilliseconds: Mapped[int | None] = mapped_column("processing_milliseconds")
    receiptNumber: Mapped[str | None] = mapped_column("receipt_number", Text)
    fileHash: Mapped[str | None] = mapped_column("file_hash", Text, index=True)
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class ReceiptItem(Base):
    __tablename__ = "receipt_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    receiptId: Mapped[int] = mapped_column(
        "receipt_id", ForeignKey("receipts.id", ondelete="CASCADE"), index=True
    )
    foodId: Mapped[int | None] = mapped_column(
        "food_id", ForeignKey("foods.id", ondelete="SET NULL"), index=True
    )
    originalText: Mapped[str] = mapped_column("original_text")
    name: Mapped[str]
    category: Mapped[str | None]
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    unit: Mapped[MeasurementUnit | None] = mapped_column(measurementUnitType)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    discount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"), server_default="0")
    correctedByUser: Mapped[bool] = mapped_column(
        "corrected_by_user", default=False, server_default=false()
    )
    quantityIsEstimate: Mapped[bool] = mapped_column(
        "quantity_is_estimate", default=False, server_default=false()
    )
    unhealthyKind: Mapped[UnhealthyKind | None] = mapped_column(
        "unhealthy_kind", databaseEnum(UnhealthyKind, "unhealthy_kind")
    )


class ReceiptScan(Base):
    __tablename__ = "receipt_scans"

    id: Mapped[int] = mapped_column(primary_key=True)
    householdId: Mapped[int] = mapped_column(
        "household_id", ForeignKey("households.id", ondelete="CASCADE"), index=True
    )
    userId: Mapped[int | None] = mapped_column("user_id", ForeignKey("users.id", ondelete="SET NULL"), index=True)
    processingMilliseconds: Mapped[int | None] = mapped_column("processing_milliseconds")
    inputTokens: Mapped[int | None] = mapped_column("input_tokens")
    outputTokens: Mapped[int | None] = mapped_column("output_tokens")
    createdAt: Mapped[datetime] = mapped_column(
        "created_at", DateTime(timezone=True), server_default=func.now()
    )


class ProductQuantity(Base):
    __tablename__ = "product_quantities"
    __table_args__ = (UniqueConstraint("store_key", "text_key", "quantity", "unit"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    storeKey: Mapped[str] = mapped_column("store_key", Text)
    textKey: Mapped[str] = mapped_column("text_key", Text, index=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 3))
    unit: Mapped[MeasurementUnit] = mapped_column(measurementUnitType)
    confirmationCount: Mapped[int] = mapped_column("confirmation_count", default=1, server_default="1")
    updatedAt: Mapped[datetime] = mapped_column(
        "updated_at", DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
