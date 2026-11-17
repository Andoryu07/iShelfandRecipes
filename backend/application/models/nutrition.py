from decimal import Decimal

from sqlalchemy import Numeric, Text
from sqlalchemy.orm import Mapped, mapped_column

nutritionFieldNames = (
    "energyKcal",
    "fat",
    "saturatedFat",
    "carbohydrates",
    "sugars",
    "proteins",
    "fiber",
    "salt",
)


class NutritionColumns:
    energyKcal: Mapped[Decimal | None] = mapped_column("energy_kcal", Numeric(8, 2))
    fat: Mapped[Decimal | None] = mapped_column("fat", Numeric(8, 2))
    saturatedFat: Mapped[Decimal | None] = mapped_column("saturated_fat", Numeric(8, 2))
    carbohydrates: Mapped[Decimal | None] = mapped_column("carbohydrates", Numeric(8, 2))
    sugars: Mapped[Decimal | None] = mapped_column("sugars", Numeric(8, 2))
    proteins: Mapped[Decimal | None] = mapped_column("proteins", Numeric(8, 2))
    fiber: Mapped[Decimal | None] = mapped_column("fiber", Numeric(8, 2))
    salt: Mapped[Decimal | None] = mapped_column("salt", Numeric(8, 2))
    nutriscoreGrade: Mapped[str | None] = mapped_column("nutriscore_grade", Text)
