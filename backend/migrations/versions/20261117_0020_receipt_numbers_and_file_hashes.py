"""receipt numbers and file hashes

Revision ID: 0020
Revises: 0019
Create Date: 2026-11-17 13:36:13.465870
"""
from alembic import op
import sqlalchemy as sa


revision = '0020'
down_revision = '0019'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('receipts', sa.Column('receipt_number', sa.Text(), nullable=True))
    op.add_column('receipts', sa.Column('file_hash', sa.Text(), nullable=True))
    op.create_index(op.f('ix_receipts_file_hash'), 'receipts', ['file_hash'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_receipts_file_hash'), table_name='receipts')
    op.drop_column('receipts', 'file_hash')
    op.drop_column('receipts', 'receipt_number')
