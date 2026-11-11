import enum
from typing import Type

from sqlalchemy import Enum, MetaData
from sqlalchemy.orm import DeclarativeBase

from application.models.enumerations import MeasurementUnit

namingConvention = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=namingConvention)


def databaseEnum(enumerationClass: Type[enum.Enum], name: str) -> Enum:
    return Enum(
        enumerationClass,
        name=name,
        values_callable=lambda members: [member.value for member in members],
    )


measurementUnitType = databaseEnum(MeasurementUnit, "measurement_unit")
