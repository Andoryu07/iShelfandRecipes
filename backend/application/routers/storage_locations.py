from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from application.database import getDatabaseSession
from application.dependencies import getCurrentUser, getHouseholdMembership
from application.households import findMembership
from application.models import HouseholdMember, StockItem, StorageLocation, User
from application.schemas.storage_locations import (
    CreateStorageLocationRequest,
    StorageLocationResponse,
    UpdateStorageLocationRequest,
)

router = APIRouter(tags=["storage locations"])


def buildStorageLocationResponse(storageLocation: StorageLocation) -> StorageLocationResponse:
    return StorageLocationResponse(
        id=storageLocation.id,
        householdId=storageLocation.householdId,
        name=storageLocation.name,
        kind=storageLocation.kind,
    )


def getAccessibleStorageLocation(
    storageLocationId: int,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> StorageLocation:
    storageLocation = session.get(StorageLocation, storageLocationId)
    if storageLocation is None or findMembership(session, user.id, storageLocation.householdId) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Storage location not found")
    return storageLocation


@router.get("/households/{householdId}/storage-locations", response_model=list[StorageLocationResponse])
def listStorageLocations(
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> list[StorageLocationResponse]:
    storageLocations = session.scalars(
        select(StorageLocation)
        .where(StorageLocation.householdId == membership.householdId)
        .order_by(StorageLocation.id)
    ).all()
    return [buildStorageLocationResponse(storageLocation) for storageLocation in storageLocations]


@router.post(
    "/households/{householdId}/storage-locations",
    response_model=StorageLocationResponse,
    status_code=status.HTTP_201_CREATED,
)
def createStorageLocation(
    request: CreateStorageLocationRequest,
    membership: HouseholdMember = Depends(getHouseholdMembership),
    session: Session = Depends(getDatabaseSession),
) -> StorageLocationResponse:
    storageLocation = StorageLocation(householdId=membership.householdId, name=request.name, kind=request.kind)
    session.add(storageLocation)
    session.commit()
    return buildStorageLocationResponse(storageLocation)


@router.patch("/storage-locations/{storageLocationId}", response_model=StorageLocationResponse)
def updateStorageLocation(
    request: UpdateStorageLocationRequest,
    storageLocation: StorageLocation = Depends(getAccessibleStorageLocation),
    session: Session = Depends(getDatabaseSession),
) -> StorageLocationResponse:
    if request.name is not None:
        storageLocation.name = request.name
    if request.kind is not None:
        storageLocation.kind = request.kind
    session.commit()
    return buildStorageLocationResponse(storageLocation)


@router.delete("/storage-locations/{storageLocationId}", status_code=status.HTTP_204_NO_CONTENT)
def deleteStorageLocation(
    storageLocation: StorageLocation = Depends(getAccessibleStorageLocation),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    remainingStockItemId = session.scalar(
        select(StockItem.id)
        .where(StockItem.storageLocationId == storageLocation.id, StockItem.quantity > 0)
        .limit(1)
    )
    if remainingStockItemId is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Storage location still contains food")
    session.delete(storageLocation)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
