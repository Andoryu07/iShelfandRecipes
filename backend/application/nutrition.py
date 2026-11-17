from decimal import Decimal

from application.models.nutrition import nutritionFieldNames
from application.schemas.nutrition import Nutrition


def nutritionOf(entity) -> Nutrition | None:
    values = {name: getattr(entity, name) for name in nutritionFieldNames}
    if all(value is None for value in values.values()):
        return None
    return Nutrition(**{name: float(value) if value is not None else None for name, value in values.items()})


def applyNutrition(entity, nutrition: Nutrition | None) -> None:
    for name in nutritionFieldNames:
        value = getattr(nutrition, name) if nutrition is not None else None
        setattr(entity, name, Decimal(str(round(value, 2))) if value is not None else None)
