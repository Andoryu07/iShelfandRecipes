from pydantic import BaseModel

from application.models.enumerations import StorageLocationKind
from application.schemas.common import RequiredName


class CreateStorageLocationRequest(BaseModel):
    name: RequiredName
    kind: StorageLocationKind = StorageLocationKind.custom


class UpdateStorageLocationRequest(BaseModel):
    name: RequiredName | None = None
    kind: StorageLocationKind | None = None


class StorageLocationResponse(BaseModel):
    id: int
    householdId: int
    name: str
    kind: StorageLocationKind
