"""join requests and invite links

Revision ID: 0016
Revises: 0015
Create Date: 2026-11-15 22:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0016'
down_revision = '0015'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'join_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('household_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_join_requests_household_id_households'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_join_requests_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_join_requests')),
        sa.UniqueConstraint('user_id', name=op.f('uq_join_requests_user_id')),
    )
    op.create_index(op.f('ix_join_requests_household_id'), 'join_requests', ['household_id'], unique=False)
    op.create_table(
        'invite_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('household_id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sa.String(), nullable=False),
        sa.Column('created_by_user_id', sa.Integer(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('used_by_user_id', sa.Integer(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['household_id'], ['households.id'], name=op.f('fk_invite_links_household_id_households'), ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], name=op.f('fk_invite_links_created_by_user_id_users'), ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['used_by_user_id'], ['users.id'], name=op.f('fk_invite_links_used_by_user_id_users'), ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_invite_links')),
        sa.UniqueConstraint('token_hash', name=op.f('uq_invite_links_token_hash')),
    )
    op.create_index(op.f('ix_invite_links_household_id'), 'invite_links', ['household_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_invite_links_household_id'), table_name='invite_links')
    op.drop_table('invite_links')
    op.drop_index(op.f('ix_join_requests_household_id'), table_name='join_requests')
    op.drop_table('join_requests')
