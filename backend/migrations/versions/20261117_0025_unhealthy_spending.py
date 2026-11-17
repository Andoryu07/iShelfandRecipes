"""unhealthy spending

Revision ID: 0025
Revises: 0024
Create Date: 2026-11-17 16:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from application.unhealthy import classifyUnhealthy


revision = '0025'
down_revision = '0024'
branch_labels = None
depends_on = None

unhealthyKind = postgresql.ENUM(
    'sweets', 'saltySnacks', 'sugaryDrinks', 'alcohol', 'tobacco', name='unhealthy_kind', create_type=False
)


def upgrade() -> None:
    unhealthyKind.create(op.get_bind(), checkfirst=True)
    op.add_column('receipt_items', sa.Column('unhealthy_kind', unhealthyKind, nullable=True))
    connection = op.get_bind()
    items = connection.execute(sa.text("SELECT id, name, original_text, category FROM receipt_items")).all()
    for itemId, name, originalText, category in items:
        kind = classifyUnhealthy(name, originalText, category)
        if kind is not None:
            connection.execute(
                sa.text("UPDATE receipt_items SET unhealthy_kind = CAST(:kind AS unhealthy_kind) WHERE id = :id"),
                {"kind": kind.value, "id": itemId},
            )


def downgrade() -> None:
    op.drop_column('receipt_items', 'unhealthy_kind')
    unhealthyKind.drop(op.get_bind(), checkfirst=True)
