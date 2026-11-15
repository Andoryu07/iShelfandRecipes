"""recipe dish types and vegetarian flag

Revision ID: 0013
Revises: 0012
Create Date: 2026-11-15 16:00:00
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '0013'
down_revision = '0012'
branch_labels = None
depends_on = None

dishType = postgresql.ENUM('soup', 'mainCourse', 'sideDish', 'dessert', 'breakfast', name='dish_type', create_type=False)
predefinedMainCourses = ('Svíčková na smetaně', 'Vepřo knedlo zelo', 'Smažený sýr', 'Hovězí guláš', 'Rajská omáčka')


def upgrade() -> None:
    dishType.create(op.get_bind(), checkfirst=True)
    op.add_column('recipes', sa.Column('dish_type', dishType, nullable=True))
    op.add_column('recipes', sa.Column('is_vegetarian', sa.Boolean(), server_default=sa.false(), nullable=False))
    recipes = sa.table(
        'recipes',
        sa.column('name', sa.String()),
        sa.column('is_predefined', sa.Boolean()),
        sa.column('dish_type', dishType),
        sa.column('is_vegetarian', sa.Boolean()),
    )
    op.execute(
        recipes.update()
        .where(recipes.c.is_predefined.is_(True), recipes.c.name.in_(predefinedMainCourses))
        .values(dish_type='mainCourse')
    )
    op.execute(
        recipes.update()
        .where(recipes.c.is_predefined.is_(True), recipes.c.name == 'Smažený sýr')
        .values(is_vegetarian=True)
    )


def downgrade() -> None:
    op.drop_column('recipes', 'is_vegetarian')
    op.drop_column('recipes', 'dish_type')
    dishType.drop(op.get_bind(), checkfirst=True)
