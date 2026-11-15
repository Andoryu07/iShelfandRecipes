"""recipe scans and recipe photo consent

Revision ID: 0015
Revises: 0014
Create Date: 2026-11-15 20:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0015'
down_revision = '0014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('recipe_photo_consent_given_at', sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        'recipe_scans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('household_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('photo_count', sa.Integer(), nullable=False),
        sa.Column('processing_milliseconds', sa.Integer(), nullable=True),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_recipe_scans_household_id_households'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_recipe_scans_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_recipe_scans')),
    )
    op.create_index(op.f('ix_recipe_scans_household_id'), 'recipe_scans', ['household_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recipe_scans_household_id'), table_name='recipe_scans')
    op.drop_table('recipe_scans')
    op.drop_column('users', 'recipe_photo_consent_given_at')
