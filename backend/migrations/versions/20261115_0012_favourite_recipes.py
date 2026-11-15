"""favourite recipes

Revision ID: 0012
Revises: 0011
Create Date: 2026-11-15 14:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0012'
down_revision = '0011'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'favourite_recipes',
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], name=op.f('fk_favourite_recipes_recipe_id_recipes'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_favourite_recipes_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('user_id', 'recipe_id', name=op.f('pk_favourite_recipes')),
    )
    op.create_index(op.f('ix_favourite_recipes_recipe_id'), 'favourite_recipes', ['recipe_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_favourite_recipes_recipe_id'), table_name='favourite_recipes')
    op.drop_table('favourite_recipes')
