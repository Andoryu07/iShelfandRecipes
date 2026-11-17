import re
from datetime import date
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from application.models import Receipt
from application.schemas.receipts import SavedReceiptReference


def normalizeReceiptNumber(receiptNumber: str | None) -> str | None:
    if not receiptNumber:
        return None
    digits = re.sub(r"\D", "", receiptNumber)
    if len(digits) >= 3:
        return digits
    normalized = re.sub(r"[^0-9a-z]", "", receiptNumber.lower())
    return normalized or None


def buildReference(receipt: Receipt, matchedBy: str) -> SavedReceiptReference:
    return SavedReceiptReference(
        receiptId=receipt.id,
        storeName=receipt.storeName,
        purchasedOn=receipt.purchasedOn,
        totalAmount=receipt.totalAmount,
        matchedBy=matchedBy,
    )


def findReceiptWithSameFile(session: Session, householdId: int, fileHash: str) -> Receipt | None:
    return session.scalar(
        select(Receipt)
        .where(Receipt.householdId == householdId, Receipt.fileHash == fileHash)
        .order_by(Receipt.id.desc())
        .limit(1)
    )


def findPossibleDuplicate(
    session: Session,
    householdId: int,
    receiptNumber: str | None,
    storeName: str | None,
    purchasedOn: date | None,
    totalAmount: Decimal | None,
) -> SavedReceiptReference | None:
    normalizedNumber = normalizeReceiptNumber(receiptNumber)
    sameStore = func.lower(Receipt.storeName) == (storeName or "").lower()
    if normalizedNumber:
        candidates = session.scalars(
            select(Receipt)
            .where(Receipt.householdId == householdId, Receipt.receiptNumber.is_not(None))
            .where(sameStore | (Receipt.purchasedOn == purchasedOn))
            .order_by(Receipt.id.desc())
        )
        for receipt in candidates:
            if normalizeReceiptNumber(receipt.receiptNumber) == normalizedNumber:
                return buildReference(receipt, "receiptNumber")
    if storeName and purchasedOn and totalAmount is not None:
        receipt = session.scalar(
            select(Receipt)
            .where(
                Receipt.householdId == householdId,
                sameStore,
                Receipt.purchasedOn == purchasedOn,
                Receipt.totalAmount == totalAmount,
            )
            .order_by(Receipt.id.desc())
            .limit(1)
        )
        if receipt is not None:
            return buildReference(receipt, "storeDateTotal")
    return None
