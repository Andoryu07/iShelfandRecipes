"""frying ingredients

Revision ID: 0027
Revises: 0026
Create Date: 2026-11-17 15:23:47.429871
"""
from alembic import op
import sqlalchemy as sa


revision = '0027'
down_revision = '0026'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('recipe_ingredients', sa.Column('is_for_frying', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.execute(
        """
        UPDATE recipe_ingredients SET is_for_frying = true
        FROM recipes, foods
        WHERE recipes.id = recipe_ingredients.recipe_id AND foods.id = recipe_ingredients.food_id
          AND recipes.is_predefined AND recipes.name = 'Smažený sýr' AND foods.name = 'Olej slunečnicový'
        """
    )


def downgrade() -> None:
    op.drop_column('recipe_ingredients', 'is_for_frying')
