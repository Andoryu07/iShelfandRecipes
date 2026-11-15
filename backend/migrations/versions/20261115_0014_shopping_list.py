"""shopping list

Revision ID: 0014
Revises: 0013
Create Date: 2026-11-15 18:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0014'
down_revision = '0013'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'shopping_list_items',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('household_id', sa.Integer(), nullable=False),
        sa.Column('owner_user_id', sa.Integer(), nullable=True),
        sa.Column('food_id', sa.Integer(), nullable=True),
        sa.Column('name', sa.String(), nullable=False),
        sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=True),
        sa.Column('note', sa.String(), nullable=True),
        sa.Column('recipe_id', sa.Integer(), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('checked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('checked_by_user_id', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_shopping_list_items_household_id_households'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['owner_user_id'], ['users.id'], name=op.f('fk_shopping_list_items_owner_user_id_users'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['food_id'], ['foods.id'], name=op.f('fk_shopping_list_items_food_id_foods'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], name=op.f('fk_shopping_list_items_recipe_id_recipes'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name=op.f('fk_shopping_list_items_created_by_user_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['checked_by_user_id'], ['users.id'], name=op.f('fk_shopping_list_items_checked_by_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_shopping_list_items')),
    )
    op.create_index(op.f('ix_shopping_list_items_household_id'), 'shopping_list_items', ['household_id'], unique=False)
    op.create_index(op.f('ix_shopping_list_items_owner_user_id'), 'shopping_list_items', ['owner_user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_shopping_list_items_owner_user_id'), table_name='shopping_list_items')
    op.drop_index(op.f('ix_shopping_list_items_household_id'), table_name='shopping_list_items')
    op.drop_table('shopping_list_items')
