"""nutrition

Revision ID: 0024
Revises: 0023
Create Date: 2026-11-17 14:57:12.937832
"""
from alembic import op
import sqlalchemy as sa


revision = '0024'
down_revision = '0023'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('catalog_products', sa.Column('energy_kcal', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('fat', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('saturated_fat', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('carbohydrates', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('sugars', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('proteins', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('fiber', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('salt', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('catalog_products', sa.Column('nutriscore_grade', sa.Text(), nullable=True))
    op.add_column('foods', sa.Column('piece_weight_grams', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('energy_kcal', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('fat', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('saturated_fat', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('carbohydrates', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('sugars', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('proteins', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('fiber', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('salt', sa.Numeric(precision=8, scale=2), nullable=True))
    op.add_column('foods', sa.Column('nutriscore_grade', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('foods', 'nutriscore_grade')
    op.drop_column('foods', 'salt')
    op.drop_column('foods', 'fiber')
    op.drop_column('foods', 'proteins')
    op.drop_column('foods', 'sugars')
    op.drop_column('foods', 'carbohydrates')
    op.drop_column('foods', 'saturated_fat')
    op.drop_column('foods', 'fat')
    op.drop_column('foods', 'energy_kcal')
    op.drop_column('foods', 'piece_weight_grams')
    op.drop_column('catalog_products', 'nutriscore_grade')
    op.drop_column('catalog_products', 'salt')
    op.drop_column('catalog_products', 'fiber')
    op.drop_column('catalog_products', 'proteins')
    op.drop_column('catalog_products', 'sugars')
    op.drop_column('catalog_products', 'carbohydrates')
    op.drop_column('catalog_products', 'saturated_fat')
    op.drop_column('catalog_products', 'fat')
    op.drop_column('catalog_products', 'energy_kcal')
