from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Numeric, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from application.models.base import Base, measurementUnitType
from application.models.enumerations import MeasurementUnit
from application.models.nutrition import NutritionColumns


class CatalogProduct(Base, NutritionColumns):
    __tablename__ = "catalog_products"

    id: Mapped[int] = mapped_column(primary_key=True)
    barcode: Mapped[str] = mapped_column(Text, unique=True)
    name: Mapped[str] = mapped_column(Text)
    nameKey: Mapped[str] = mapped_column("name_key", Text)
    brand: Mapped[str | None] = mapped_column(Text)
    quantityText: Mapped[str | None] = mapped_column("quantity_text", Text)
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(12, 3))
    unit: Mapped[MeasurementUnit | None] = mapped_column(measurementUnitType)
    category: Mapped[str] = mapped_column(Text)
    popularity: Mapped[int] = mapped_column(default=0, server_default="0")
    importedAt: Mapped[datetime] = mapped_column(
        "imported_at", DateTime(timezone=True), server_default=func.now()
    )
