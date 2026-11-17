"""food catalog

Revision ID: 0022
Revises: 0021
Create Date: 2026-11-17 13:59:36.933144
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0022'
down_revision = '0021'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table('catalog_products',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('barcode', sa.Text(), nullable=False),
    sa.Column('name', sa.Text(), nullable=False),
    sa.Column('name_key', sa.Text(), nullable=False),
    sa.Column('brand', sa.Text(), nullable=True),
    sa.Column('quantity_text', sa.Text(), nullable=True),
    sa.Column('quantity', sa.Numeric(precision=12, scale=3), nullable=True),
    sa.Column('unit', postgresql.ENUM(name='measurement_unit', create_type=False), nullable=True),
    sa.Column('category', sa.Text(), nullable=False),
    sa.Column('popularity', sa.Integer(), server_default='0', nullable=False),
    sa.Column('imported_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_catalog_products')),
    sa.UniqueConstraint('barcode', name=op.f('uq_catalog_products_barcode'))
    )


def downgrade() -> None:
    op.drop_table('catalog_products')
