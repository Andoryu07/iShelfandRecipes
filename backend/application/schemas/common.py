from typing import Annotated

from pydantic import AfterValidator, StringConstraints

RequiredName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]


def capitalizeFirstLetter(text: str) -> str:
    return text[:1].upper() + text[1:]


FoodName = Annotated[RequiredName, AfterValidator(capitalizeFirstLetter)]
