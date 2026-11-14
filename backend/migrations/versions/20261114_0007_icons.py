"""icons

Revision ID: 0007
Revises: 0006
Create Date: 2026-11-14 18:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0007'
down_revision = '0006'
branch_labels = None
depends_on = None

tables = ('storage_locations', 'foods', 'recipes')


def upgrade() -> None:
    for table in tables:
        op.add_column(table, sa.Column('icon', sa.String(), nullable=True))


def downgrade() -> None:
    for table in tables:
        op.drop_column(table, 'icon')
