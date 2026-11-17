"""receipt quantity sources

Revision ID: 0021
Revises: 0020
Create Date: 2026-11-17 13:49:26.164403
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0021'
down_revision = '0020'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('product_quantities',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('store_key', sa.Text(), nullable=False),
    sa.Column('text_key', sa.Text(), nullable=False),
    sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=False),
    sa.Column('unit', postgresql.ENUM(name='measurement_unit', create_type=False), nullable=False),
    sa.Column('confirmation_count', sa.Integer(), server_default='1', nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_product_quantities')),
    sa.UniqueConstraint('store_key', 'text_key', 'quantity', 'unit', name=op.f('uq_product_quantities_store_key_text_key_quantity_unit'))
    )
    op.create_index(op.f('ix_product_quantities_text_key'), 'product_quantities', ['text_key'], unique=False)
    op.add_column('receipt_items', sa.Column('quantity_is_estimate', sa.Boolean(), server_default=sa.text('false'), nullable=False))
    op.execute(
        """
        INSERT INTO product_quantities (store_key, text_key, quantity, unit, confirmation_count)
        SELECT lower(unaccent(coalesce(r.store_name, ''))), lower(unaccent(i.original_text)), i.quantity, i.unit, count(*)
        FROM receipt_items i JOIN receipts r ON r.id = i.receipt_id
        WHERE i.quantity IS NOT NULL AND i.unit IS NOT NULL
        GROUP BY 1, 2, 3, 4
        """
    )


def downgrade() -> None:
    op.drop_column('receipt_items', 'quantity_is_estimate')
    op.drop_index(op.f('ix_product_quantities_text_key'), table_name='product_quantities')
    op.drop_table('product_quantities')
