"""plans and receipt scans

Revision ID: 0018
Revises: 0017
Create Date: 2026-11-16 20:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0018'
down_revision = '0017'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('users', sa.Column('premium_until', sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        'receipt_scans',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('household_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('processing_milliseconds', sa.Integer(), nullable=True),
        sa.Column('input_tokens', sa.Integer(), nullable=True),
        sa.Column('output_tokens', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_receipt_scans_household_id_households'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_receipt_scans_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_receipt_scans')),
    )
    op.create_index(op.f('ix_receipt_scans_household_id'), 'receipt_scans', ['household_id'])
    op.create_index(op.f('ix_receipt_scans_user_id'), 'receipt_scans', ['user_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_receipt_scans_user_id'), table_name='receipt_scans')
    op.drop_index(op.f('ix_receipt_scans_household_id'), table_name='receipt_scans')
    op.drop_table('receipt_scans')
    op.drop_column('users', 'premium_until')
