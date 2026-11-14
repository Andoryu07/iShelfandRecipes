from pydantic import BaseModel

from application.models.enumerations import StorageLocationKind
from application.schemas.common import Icon, RequiredName


class CreateStorageLocationRequest(BaseModel):
    name: RequiredName
    kind: StorageLocationKind = StorageLocationKind.custom
    icon: Icon | None = None


class UpdateStorageLocationRequest(BaseModel):
    name: RequiredName | None = None
    kind: StorageLocationKind | None = None
    icon: Icon | None = None


class StorageLocationResponse(BaseModel):
    id: int
    householdId: int
    name: str
    kind: StorageLocationKind
    icon: str | None
