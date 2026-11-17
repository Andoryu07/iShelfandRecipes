"""food barcodes

Revision ID: 0023
Revises: 0022
Create Date: 2026-11-17 14:22:40.714550
"""
from alembic import op
import sqlalchemy as sa


revision = '0023'
down_revision = '0022'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('foods', sa.Column('barcode', sa.Text(), nullable=True))
    op.create_index('uq_foods_household_id_barcode', 'foods', ['household_id', 'barcode'], unique=True, postgresql_where=sa.text('barcode IS NOT NULL'))


def downgrade() -> None:
    op.drop_index('uq_foods_household_id_barcode', table_name='foods', postgresql_where=sa.text('barcode IS NOT NULL'))
    op.drop_column('foods', 'barcode')
