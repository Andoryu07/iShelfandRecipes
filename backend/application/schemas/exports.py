from datetime import date

from pydantic import BaseModel

from application.models.enumerations import MeasurementUnit


class ReceiptItemExportRow(BaseModel):
    purchasedOn: date
    storeName: str | None
    receiptTotal: float
    originalText: str
    name: str
    category: str | None
    quantity: float | None
    unit: MeasurementUnit | None
    price: float
    discount: float
