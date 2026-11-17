from decimal import Decimal

import pytest

from application.models.enumerations import MeasurementUnit
from application.receipts.quantities import quantityFromText


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("MLEKO POLOTUC 1L", (Decimal("1000"), MeasurementUnit.milliliter)),
        ("PIVO PLZEN 0,5L", (Decimal("500"), MeasurementUnit.milliliter)),
        ("VODA 6X1,5L", (Decimal("1500"), MeasurementUnit.milliliter)),
        ("JOG.BILY 150G", (Decimal("150"), MeasurementUnit.gram)),
        ("MOUKA HL. 1KG", (Decimal("1000"), MeasurementUnit.gram)),
        ("VEJCE M 10KS", (Decimal("10"), MeasurementUnit.piece)),
        ("SMETANA 33% 2,5DL", (Decimal("250"), MeasurementUnit.milliliter)),
        ("ROHLIK TUKOVY", None),
        ("COCA COLA ZERO", None),
        ("MLEKO 0L", None),
    ],
)
def test_quantityIsReadFromReceiptText(text: str, expected) -> None:
    assert quantityFromText(text) == expected
