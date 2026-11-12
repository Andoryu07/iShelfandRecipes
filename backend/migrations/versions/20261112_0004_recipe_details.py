"""recipe details

Revision ID: 0004
Revises: 0003
Create Date: 2026-11-12 20:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('recipes', sa.Column('preparation_minutes', sa.Integer(), nullable=True))
    op.add_column('recipe_ingredients', sa.Column('accepts_any_of_kind', sa.Boolean(), server_default=sa.true(), nullable=False))
    op.add_column('recipe_ingredients', sa.Column('is_optional', sa.Boolean(), server_default=sa.false(), nullable=False))


def downgrade() -> None:
    op.drop_column('recipe_ingredients', 'is_optional')
    op.drop_column('recipe_ingredients', 'accepts_any_of_kind')
    op.drop_column('recipes', 'preparation_minutes')
