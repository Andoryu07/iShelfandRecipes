"""personal notification settings

Revision ID: 0011
Revises: 0010
Create Date: 2026-11-15 12:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0011'
down_revision = '0010'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('household_members', sa.Column('notification_hour', sa.Integer(), server_default='8', nullable=False))
    op.add_column('household_members', sa.Column('expiration_warning_days', sa.Integer(), server_default='2', nullable=False))
    op.add_column('household_members', sa.Column('expiration_notified_on', sa.Date(), nullable=True))
    op.create_check_constraint(op.f('ck_household_members_notification_hour_valid'), 'household_members', 'notification_hour BETWEEN 0 AND 23')
    op.create_check_constraint(op.f('ck_household_members_expiration_warning_days_valid'), 'household_members', 'expiration_warning_days BETWEEN 0 AND 14')
    op.execute(
        'UPDATE household_members SET expiration_notified_on = households.expiration_notified_on '
        'FROM households WHERE households.id = household_members.household_id'
    )
    op.drop_column('households', 'expiration_notified_on')


def downgrade() -> None:
    op.add_column('households', sa.Column('expiration_notified_on', sa.Date(), nullable=True))
    op.execute(
        'UPDATE households SET expiration_notified_on = latest.notified_on FROM '
        '(SELECT household_id, max(expiration_notified_on) AS notified_on FROM household_members GROUP BY household_id) AS latest '
        'WHERE latest.household_id = households.id'
    )
    op.drop_constraint(op.f('ck_household_members_expiration_warning_days_valid'), 'household_members', type_='check')
    op.drop_constraint(op.f('ck_household_members_notification_hour_valid'), 'household_members', type_='check')
    op.drop_column('household_members', 'expiration_notified_on')
    op.drop_column('household_members', 'expiration_warning_days')
    op.drop_column('household_members', 'notification_hour')
