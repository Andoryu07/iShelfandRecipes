"""create initial schema

Revision ID: 0001
Revises: 
Create Date: 2026-11-11 18:21:29.272366
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

measurementUnit = postgresql.ENUM('gram', 'milliliter', 'piece', name='measurement_unit', create_type=False)
householdRole = postgresql.ENUM('owner', 'member', name='household_role', create_type=False)
storageLocationKind = postgresql.ENUM('fridge', 'freezer', 'pantry', 'custom', name='storage_location_kind', create_type=False)
reservationStatus = postgresql.ENUM('active', 'fulfilled', 'cancelled', name='reservation_status', create_type=False)
stockMovementReason = postgresql.ENUM('eaten', 'spoiled', 'destroyed', 'cooked', 'correction', name='stock_movement_reason', create_type=False)

enumerations = [measurementUnit, householdRole, storageLocationKind, reservationStatus, stockMovementReason]


def upgrade() -> None:
    for enumeration in enumerations:
        enumeration.create(op.get_bind(), checkfirst=True)
    op.create_table('households',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('invite_code', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_households')),
    sa.UniqueConstraint('invite_code', name=op.f('uq_households_invite_code'))
    )
    op.create_table('users',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('email', sa.String(), nullable=False),
    sa.Column('password_hash', sa.String(), nullable=False),
    sa.Column('display_name', sa.String(), nullable=False),
    sa.Column('receipt_consent_given_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_users')),
    sa.UniqueConstraint('email', name=op.f('uq_users_email'))
    )
    op.create_table('foods',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('category', sa.String(), nullable=True),
    sa.Column('base_unit', measurementUnit, nullable=False),
    sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_foods_household_id_households'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_foods')),
    sa.UniqueConstraint('household_id', 'name', name=op.f('uq_foods_household_id_name'))
    )
    op.create_table('household_members',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('role', householdRole, nullable=False),
    sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_household_members_household_id_households'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_household_members_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_household_members')),
    sa.UniqueConstraint('user_id', name='uq_household_members_user_id_single_household')
    )
    op.create_index(op.f('ix_household_members_household_id'), 'household_members', ['household_id'], unique=False)
    op.create_table('push_subscriptions',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('endpoint', sa.Text(), nullable=False),
    sa.Column('public_key', sa.String(), nullable=False),
    sa.Column('authentication_secret', sa.String(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_push_subscriptions_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_push_subscriptions')),
    sa.UniqueConstraint('endpoint', name=op.f('uq_push_subscriptions_endpoint'))
    )
    op.create_index(op.f('ix_push_subscriptions_user_id'), 'push_subscriptions', ['user_id'], unique=False)
    op.create_table('receipts',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('store_name', sa.String(), nullable=True),
    sa.Column('purchased_on', sa.Date(), nullable=False),
    sa.Column('total_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('items_sum_matches_total', sa.Boolean(), nullable=False),
    sa.Column('processing_milliseconds', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_receipts_household_id_households'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_receipts_user_id_users'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_receipts'))
    )
    op.create_index(op.f('ix_receipts_household_id'), 'receipts', ['household_id'], unique=False)
    op.create_table('recipes',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('instructions', sa.Text(), nullable=False),
    sa.Column('servings', sa.Integer(), nullable=False),
    sa.Column('is_predefined', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('servings > 0', name=op.f('ck_recipes_servings_positive')),
    sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_recipes_household_id_households'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_recipes'))
    )
    op.create_index(op.f('ix_recipes_household_id'), 'recipes', ['household_id'], unique=False)
    op.create_table('refresh_tokens',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('token_hash', sa.String(), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_refresh_tokens_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_refresh_tokens')),
    sa.UniqueConstraint('token_hash', name=op.f('uq_refresh_tokens_token_hash'))
    )
    op.create_index(op.f('ix_refresh_tokens_user_id'), 'refresh_tokens', ['user_id'], unique=False)
    op.create_table('storage_locations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('household_id', sa.Integer(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('kind', storageLocationKind, nullable=False),
    sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_storage_locations_household_id_households'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_storage_locations'))
    )
    op.create_index(op.f('ix_storage_locations_household_id'), 'storage_locations', ['household_id'], unique=False)
    op.create_table('receipt_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('receipt_id', sa.Integer(), nullable=False),
    sa.Column('food_id', sa.Integer(), nullable=True),
    sa.Column('original_text', sa.String(), nullable=False),
    sa.Column('name', sa.String(), nullable=False),
    sa.Column('category', sa.String(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=True),
    sa.Column('unit', measurementUnit, nullable=True),
    sa.Column('price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('discount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
    sa.Column('corrected_by_user', sa.Boolean(), server_default=sa.text('false'), nullable=False),
    sa.ForeignKeyConstraint(['food_id'], ['foods.id'], name=op.f('fk_receipt_items_food_id_foods'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['receipt_id'], ['receipts.id'], name=op.f('fk_receipt_items_receipt_id_receipts'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_receipt_items'))
    )
    op.create_index(op.f('ix_receipt_items_food_id'), 'receipt_items', ['food_id'], unique=False)
    op.create_index(op.f('ix_receipt_items_receipt_id'), 'receipt_items', ['receipt_id'], unique=False)
    op.create_table('recipe_ingredients',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('recipe_id', sa.Integer(), nullable=False),
    sa.Column('food_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=False),
    sa.CheckConstraint('quantity > 0', name=op.f('ck_recipe_ingredients_quantity_positive')),
    sa.ForeignKeyConstraint(['food_id'], ['foods.id'], name=op.f('fk_recipe_ingredients_food_id_foods'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], name=op.f('fk_recipe_ingredients_recipe_id_recipes'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_recipe_ingredients')),
    sa.UniqueConstraint('recipe_id', 'food_id', name=op.f('uq_recipe_ingredients_recipe_id_food_id'))
    )
    op.create_index(op.f('ix_recipe_ingredients_food_id'), 'recipe_ingredients', ['food_id'], unique=False)
    op.create_table('stock_items',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('storage_location_id', sa.Integer(), nullable=False),
    sa.Column('food_id', sa.Integer(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=False),
    sa.Column('expiration_date', sa.Date(), nullable=True),
    sa.Column('receipt_item_id', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('quantity >= 0', name=op.f('ck_stock_items_quantity_not_negative')),
    sa.ForeignKeyConstraint(['food_id'], ['foods.id'], name=op.f('fk_stock_items_food_id_foods'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['receipt_item_id'], ['receipt_items.id'], name=op.f('fk_stock_items_receipt_item_id_receipt_items'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['storage_location_id'], ['storage_locations.id'], name=op.f('fk_stock_items_storage_location_id_storage_locations'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_stock_items')),
    sa.UniqueConstraint('receipt_item_id', name=op.f('uq_stock_items_receipt_item_id'))
    )
    op.create_index(op.f('ix_stock_items_expiration_date'), 'stock_items', ['expiration_date'], unique=False)
    op.create_index(op.f('ix_stock_items_food_id'), 'stock_items', ['food_id'], unique=False)
    op.create_index(op.f('ix_stock_items_storage_location_id'), 'stock_items', ['storage_location_id'], unique=False)
    op.create_table('reservations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('stock_item_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('recipe_id', sa.Integer(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=False),
    sa.Column('note', sa.Text(), nullable=True),
    sa.Column('status', reservationStatus, nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('quantity > 0', name=op.f('ck_reservations_quantity_positive')),
    sa.ForeignKeyConstraint(['recipe_id'], ['recipes.id'], name=op.f('fk_reservations_recipe_id_recipes'), ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['stock_item_id'], ['stock_items.id'], name=op.f('fk_reservations_stock_item_id_stock_items'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_reservations_user_id_users'), ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_reservations'))
    )
    op.create_index(op.f('ix_reservations_stock_item_id'), 'reservations', ['stock_item_id'], unique=False)
    op.create_index(op.f('ix_reservations_user_id'), 'reservations', ['user_id'], unique=False)
    op.create_table('stock_movements',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('stock_item_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=True),
    sa.Column('quantity_change', sa.Numeric(precision=12, scale=3), nullable=False),
    sa.Column('reason', stockMovementReason, nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.CheckConstraint('quantity_change <> 0', name=op.f('ck_stock_movements_quantity_change_not_zero')),
    sa.ForeignKeyConstraint(['stock_item_id'], ['stock_items.id'], name=op.f('fk_stock_movements_stock_item_id_stock_items'), ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_stock_movements_user_id_users'), ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_stock_movements'))
    )
    op.create_index(op.f('ix_stock_movements_stock_item_id'), 'stock_movements', ['stock_item_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_stock_movements_stock_item_id'), table_name='stock_movements')
    op.drop_table('stock_movements')
    op.drop_index(op.f('ix_reservations_user_id'), table_name='reservations')
    op.drop_index(op.f('ix_reservations_stock_item_id'), table_name='reservations')
    op.drop_table('reservations')
    op.drop_index(op.f('ix_stock_items_storage_location_id'), table_name='stock_items')
    op.drop_index(op.f('ix_stock_items_food_id'), table_name='stock_items')
    op.drop_index(op.f('ix_stock_items_expiration_date'), table_name='stock_items')
    op.drop_table('stock_items')
    op.drop_index(op.f('ix_recipe_ingredients_food_id'), table_name='recipe_ingredients')
    op.drop_table('recipe_ingredients')
    op.drop_index(op.f('ix_receipt_items_receipt_id'), table_name='receipt_items')
    op.drop_index(op.f('ix_receipt_items_food_id'), table_name='receipt_items')
    op.drop_table('receipt_items')
    op.drop_index(op.f('ix_storage_locations_household_id'), table_name='storage_locations')
    op.drop_table('storage_locations')
    op.drop_index(op.f('ix_refresh_tokens_user_id'), table_name='refresh_tokens')
    op.drop_table('refresh_tokens')
    op.drop_index(op.f('ix_recipes_household_id'), table_name='recipes')
    op.drop_table('recipes')
    op.drop_index(op.f('ix_receipts_household_id'), table_name='receipts')
    op.drop_table('receipts')
    op.drop_index(op.f('ix_push_subscriptions_user_id'), table_name='push_subscriptions')
    op.drop_table('push_subscriptions')
    op.drop_index(op.f('ix_household_members_household_id'), table_name='household_members')
    op.drop_table('household_members')
    op.drop_table('foods')
    op.drop_table('users')
    op.drop_table('households')
    for enumeration in enumerations:
        enumeration.drop(op.get_bind(), checkfirst=True)
