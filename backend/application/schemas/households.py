from datetime import datetime

from pydantic import BaseModel, Field

from application.models.enumerations import HouseholdRole
from application.schemas.common import RequiredName


class CreateHouseholdRequest(BaseModel):
    name: RequiredName


class UpdateHouseholdRequest(BaseModel):
    name: RequiredName


class JoinHouseholdRequest(BaseModel):
    inviteCode: str = Field(min_length=1, max_length=50)


class HouseholdResponse(BaseModel):
    id: int
    name: str
    inviteCode: str
    role: HouseholdRole
    createdAt: datetime


class HouseholdMemberResponse(BaseModel):
    userId: int
    displayName: str
    role: HouseholdRole
    joinedAt: datetime
