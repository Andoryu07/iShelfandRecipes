"""stock and cooking history

Revision ID: 0009
Revises: 0008
Create Date: 2026-11-14 22:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0009'
down_revision = '0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE stock_movement_reason ADD VALUE IF NOT EXISTS 'moved'")
    op.add_column('stock_movements', sa.Column('storage_location_id', sa.Integer(), nullable=True))
    op.add_column('stock_movements', sa.Column('target_storage_location_id', sa.Integer(), nullable=True))
    op.create_foreign_key(op.f('fk_stock_movements_storage_location_id_storage_locations'), 'stock_movements', 'storage_locations', ['storage_location_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key(op.f('fk_stock_movements_target_storage_location_id_storage_locations'), 'stock_movements', 'storage_locations', ['target_storage_location_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_stock_movements_storage_location_id'), 'stock_movements', ['storage_location_id'], unique=False)
    op.create_index(op.f('ix_stock_movements_target_storage_location_id'), 'stock_movements', ['target_storage_location_id'], unique=False)
    op.execute(
        'UPDATE stock_movements SET storage_location_id = stock_items.storage_location_id '
        'FROM stock_items WHERE stock_items.id = stock_movements.stock_item_id'
    )
    op.drop_constraint(op.f('ck_stock_movements_quantity_change_not_zero'), 'stock_movements', type_='check')
    op.create_check_constraint(op.f('ck_stock_movements_quantity_change_not_zero'), 'stock_movements', "quantity_change <> 0 OR reason = 'moved'")

    op.add_column('stock_items', sa.Column('created_by_user_id', sa.Integer(), nullable=True))
    op.create_foreign_key(op.f('fk_stock_items_created_by_user_id_users'), 'stock_items', 'users', ['created_by_user_id'], ['id'], ondelete='SET NULL')
    op.execute(
        'UPDATE stock_items SET created_by_user_id = receipts.user_id FROM receipt_items, receipts '
        'WHERE receipt_items.id = stock_items.receipt_item_id AND receipts.id = receipt_items.receipt_id'
    )

    op.create_table(
        'recipe_cookings',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('recipe_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('servings', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], name=op.f('fk_recipe_cookings_recipe_id_recipes'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_recipe_cookings_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_recipe_cookings')),
    )
    op.create_index(op.f('ix_recipe_cookings_recipe_id'), 'recipe_cookings', ['recipe_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recipe_cookings_recipe_id'), table_name='recipe_cookings')
    op.drop_table('recipe_cookings')
    op.drop_constraint(op.f('fk_stock_items_created_by_user_id_users'), 'stock_items', type_='foreignkey')
    op.drop_column('stock_items', 'created_by_user_id')

    op.execute("DELETE FROM stock_movements WHERE reason = 'moved'")
    op.drop_constraint(op.f('ck_stock_movements_quantity_change_not_zero'), 'stock_movements', type_='check')
    op.drop_index(op.f('ix_stock_movements_target_storage_location_id'), table_name='stock_movements')
    op.drop_index(op.f('ix_stock_movements_storage_location_id'), table_name='stock_movements')
    op.drop_constraint(op.f('fk_stock_movements_target_storage_location_id_storage_locations'), 'stock_movements', type_='foreignkey')
    op.drop_constraint(op.f('fk_stock_movements_storage_location_id_storage_locations'), 'stock_movements', type_='foreignkey')
    op.drop_column('stock_movements', 'target_storage_location_id')
    op.drop_column('stock_movements', 'storage_location_id')
    op.execute('ALTER TYPE stock_movement_reason RENAME TO stock_movement_reason_old')
    op.execute("CREATE TYPE stock_movement_reason AS ENUM ('eaten', 'spoiled', 'destroyed', 'cooked', 'correction')")
    op.execute(
        'ALTER TABLE stock_movements ALTER COLUMN reason TYPE stock_movement_reason '
        'USING reason::text::stock_movement_reason'
    )
    op.execute('DROP TYPE stock_movement_reason_old')
    op.create_check_constraint(op.f('ck_stock_movements_quantity_change_not_zero'), 'stock_movements', 'quantity_change <> 0')
