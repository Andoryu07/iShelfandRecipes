"""generic food names

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-12 16:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('foods', sa.Column('generic_name', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('foods', 'generic_name')
