"""expiration notifications

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-12 22:00:00
"""
from alembic import op
import sqlalchemy as sa


revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('households', sa.Column('expiration_notified_on', sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column('households', 'expiration_notified_on')
