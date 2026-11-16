from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getHouseholdMembership
from application.models import HouseholdMember, Receipt, ReceiptItem
from application.schemas.exports import ReceiptItemExportRow

router = APIRouter(tags=["exports"])


@router.get("/households/{householdId}/exports/receipt-items", response_model=list[ReceiptItemExportRow])
def exportReceiptItems(
    membership: HouseholdMember = Depends(getHouseholdMembership), session: Session = Depends(getDatabaseSession)
) -> list[ReceiptItemExportRow]:
    rows = session.execute(
        select(Receipt, ReceiptItem)
        .join(ReceiptItem, ReceiptItem.receiptId == Receipt.id)
        .where(Receipt.householdId == membership.householdId)
        .order_by(Receipt.purchasedOn, Receipt.id, ReceiptItem.id)
    ).all()
    return [
        ReceiptItemExportRow(
            purchasedOn=receipt.purchasedOn,
            storeName=receipt.storeName,
            receiptTotal=float(receipt.totalAmount),
            originalText=item.originalText,
            name=item.name,
            category=item.category,
            quantity=float(item.quantity) if item.quantity is not None else None,
            unit=item.unit,
            price=float(item.price),
            discount=float(item.discount),
        )
        for receipt, item in rows
    ]
