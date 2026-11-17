"""nutrition of predefined foods

Revision ID: 0026
Revises: 0025
Create Date: 2026-11-17 17:00:00
"""
from alembic import op
import sqlalchemy as sa

from application.recipes.predefined import loadPredefinedData


revision = '0026'
down_revision = '0025'
branch_labels = None
depends_on = None

nutritionColumns = {
    "energyKcal": "energy_kcal",
    "fat": "fat",
    "saturatedFat": "saturated_fat",
    "carbohydrates": "carbohydrates",
    "sugars": "sugars",
    "proteins": "proteins",
    "fiber": "fiber",
    "salt": "salt",
}


def upgrade() -> None:
    connection = op.get_bind()
    emptyNutrition = " AND ".join(f"{column} IS NULL" for column in nutritionColumns.values())
    assignments = ", ".join(f"{column} = :{name}" for name, column in nutritionColumns.items())
    for food in loadPredefinedData().foods:
        if food.nutrition is None:
            continue
        connection.execute(
            sa.text(
                f"UPDATE foods SET {assignments}, "
                "piece_weight_grams = COALESCE(piece_weight_grams, :pieceWeightGrams) "
                f"WHERE lower(name) = lower(:name) AND base_unit = CAST(:baseUnit AS measurement_unit) AND {emptyNutrition}"
            ),
            {
                **{name: getattr(food.nutrition, name) for name in nutritionColumns},
                "pieceWeightGrams": food.pieceWeightGrams,
                "name": food.name,
                "baseUnit": food.baseUnit.value,
            },
        )


def downgrade() -> None:
    pass
