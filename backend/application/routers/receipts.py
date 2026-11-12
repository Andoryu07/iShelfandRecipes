import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership, notFoundError
from application.households import findMembership
from application.models import HouseholdMember, Receipt, User
from application.receipts.dependencies import getReceiptReader
from application.receipts.reading import ReceiptReader, ReceiptReadingError
from application.receipts.saving import buildReceiptSummary, loadReceiptResponse, receiptSummariesQuery, saveReceipt
from application.receipts.scanning import buildScanResponse
from application.schemas.receipts import ReceiptResponse, ReceiptSummaryResponse, SaveReceiptRequest, ScanReceiptResponse

router = APIRouter(tags=["receipts"])
logger = logging.getLogger(__name__)
maximumImageBytes = 10 * 1024 * 1024
acceptedImageTypes = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}


@router.post("/households/{householdId}/receipts/scan", response_model=ScanReceiptResponse)
def scanReceipt(
    image: UploadFile = File(),
    membership: HouseholdMember = Depends(getHouseholdMembership),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
    receiptReader: ReceiptReader = Depends(getReceiptReader),
) -> ScanReceiptResponse:
    if user.receiptConsentGivenAt is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Receipt consent has not been given")
    if image.content_type not in acceptedImageTypes:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Unsupported image type")
    imageBytes = image.file.read(maximumImageBytes + 1)
    if len(imageBytes) > maximumImageBytes:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="The image is too large")
    try:
        result = receiptReader.readReceipt(imageBytes, image.content_type)
    except ReceiptReadingError as error:
        logger.warning("Receipt reading failed: %s", error)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="The receipt could not be read")
    finally:
        del imageBytes
    logger.info(
        "Receipt read in %d ms, %s input and %s output tokens",
        result.processingMilliseconds,
        result.inputTokens,
        result.outputTokens,
    )
    return buildScanResponse(session, membership.householdId, result)


@router.post("/households/{householdId}/receipts", response_model=ReceiptResponse, status_code=status.HTTP_201_CREATED)
def createReceipt(
    request: SaveReceiptRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> ReceiptResponse:
    try:
        receiptId = saveReceipt(session, membership.householdId, user, request)
    except HTTPException:
        session.rollback()
        raise
    session.commit()
    return loadReceiptResponse(session, membership.householdId, receiptId)


@router.get("/households/{householdId}/receipts", response_model=list[ReceiptSummaryResponse])
def listReceipts(
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[ReceiptSummaryResponse]:
    rows = session.execute(
        receiptSummariesQuery(membership.householdId).order_by(Receipt.purchasedOn.desc(), Receipt.id.desc())
    ).all()
    return [buildReceiptSummary(row.Receipt, row.displayName, row.itemCount) for row in rows]


@router.get("/receipts/{receiptId}", response_model=ReceiptResponse)
def getReceipt(
    receiptId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> ReceiptResponse:
    receipt = session.get(Receipt, receiptId)
    if receipt is None or findMembership(session, user.id, receipt.householdId) is None:
        raise notFoundError("Receipt")
    return loadReceiptResponse(session, receipt.householdId, receiptId)
