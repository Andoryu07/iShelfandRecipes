from decimal import Decimal
from typing import Annotated

from pydantic import AfterValidator, Field, PlainSerializer, StringConstraints

RequiredName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


def capitalizeFirstLetter(text: str) -> str:
    return text[:1].upper() + text[1:]


FoodName = Annotated[RequiredName, AfterValidator(capitalizeFirstLetter)]

PositiveQuantity = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=3)]
NonNegativeQuantity = Annotated[Decimal, Field(ge=0, max_digits=12, decimal_places=3)]
QuantityValue = Annotated[Decimal, PlainSerializer(float, return_type=float, when_used="json")]
