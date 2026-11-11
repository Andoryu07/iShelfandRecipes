"""food names unique ignoring case and accent-insensitive search

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-12 10:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS unaccent')
    op.drop_constraint('uq_foods_household_id_name', 'foods', type_='unique')
    op.create_index('uq_foods_household_id_lower_name', 'foods', ['household_id', sa.text('lower(name)')], unique=True)


def downgrade() -> None:
    op.drop_index('uq_foods_household_id_lower_name', table_name='foods')
    op.create_unique_constraint('uq_foods_household_id_name', 'foods', ['household_id', 'name'])
    op.execute('DROP EXTENSION IF EXISTS unaccent')
