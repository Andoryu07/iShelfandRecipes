"""several households, guests and rewarded ads

Revision ID: 0019
Revises: 0018
Create Date: 2026-11-16 21:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0019'
down_revision = '0018'
branch_labels = None
depends_on = None

rewardKind = postgresql.ENUM('receiptScan', 'recipeScan', name='reward_kind', create_type=False)


def upgrade() -> None:
    rewardKind.create(op.get_bind(), checkfirst=True)
    op.create_table(
        'rewarded_ad_views',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('kind', rewardKind, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], name=op.f('fk_rewarded_ad_views_user_id_users'), ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id', name=op.f('pk_rewarded_ad_views')),
    )
    op.create_index(op.f('ix_rewarded_ad_views_user_id'), 'rewarded_ad_views', ['user_id'])
    op.drop_constraint('uq_household_members_user_id_single_household', 'household_members', type_='unique')
    op.create_unique_constraint(
        'uq_household_members_user_id_household_id', 'household_members', ['user_id', 'household_id']
    )
    op.add_column('users', sa.Column('is_guest', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.add_column('users', sa.Column('guest_address_hash', sa.Text(), nullable=True))
    op.add_column(
        'users',
        sa.Column('last_active_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    )


def downgrade() -> None:
    op.drop_column('users', 'last_active_at')
    op.drop_column('users', 'guest_address_hash')
    op.drop_column('users', 'is_guest')
    op.drop_constraint('uq_household_members_user_id_household_id', 'household_members', type_='unique')
    op.execute(
        "DELETE FROM household_members WHERE id NOT IN "
        "(SELECT MIN(id) FROM household_members GROUP BY user_id)"
    )
    op.create_unique_constraint('uq_household_members_user_id_single_household', 'household_members', ['user_id'])
    op.drop_index(op.f('ix_rewarded_ad_views_user_id'), table_name='rewarded_ad_views')
    op.drop_table('rewarded_ad_views')
    rewardKind.drop(op.get_bind(), checkfirst=True)
