"""keep cooking history after a recipe is deleted

Revision ID: 0010
Revises: 0009
Create Date: 2026-11-15 09:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0010'
down_revision = '0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('recipe_cookings', sa.Column('household_id', sa.Integer(), nullable=True))
    op.add_column('recipe_cookings', sa.Column('recipe_name', sa.String(), nullable=True))
    op.execute(
        'UPDATE recipe_cookings SET household_id = recipes.household_id, recipe_name = recipes.name '
        'FROM recipes WHERE recipes.id = recipe_cookings.recipe_id'
    )
    op.alter_column('recipe_cookings', 'household_id', nullable=False)
    op.alter_column('recipe_cookings', 'recipe_name', nullable=False)
    op.create_foreign_key(op.f('fk_recipe_cookings_household_id_households'), 'recipe_cookings', 'households', ['household_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_recipe_cookings_household_id'), 'recipe_cookings', ['household_id'], unique=False)
    op.alter_column('recipe_cookings', 'recipe_id', nullable=True)
    op.drop_constraint(op.f('fk_recipe_cookings_recipe_id_recipes'), 'recipe_cookings', type_='foreignkey')
    op.create_foreign_key(op.f('fk_recipe_cookings_recipe_id_recipes'), 'recipe_cookings', 'recipes', ['recipe_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    op.execute('DELETE FROM recipe_cookings WHERE recipe_id IS NULL')
    op.drop_constraint(op.f('fk_recipe_cookings_recipe_id_recipes'), 'recipe_cookings', type_='foreignkey')
    op.create_foreign_key(op.f('fk_recipe_cookings_recipe_id_recipes'), 'recipe_cookings', 'recipes', ['recipe_id'], ['id'], ondelete='CASCADE')
    op.alter_column('recipe_cookings', 'recipe_id', nullable=False)
    op.drop_index(op.f('ix_recipe_cookings_household_id'), table_name='recipe_cookings')
    op.drop_constraint(op.f('fk_recipe_cookings_household_id_households'), 'recipe_cookings', type_='foreignkey')
    op.drop_column('recipe_cookings', 'recipe_name')
    op.drop_column('recipe_cookings', 'household_id')
