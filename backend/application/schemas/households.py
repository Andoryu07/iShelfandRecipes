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


class NotificationSettingsRequest(BaseModel):
    notificationHour: int | None = Field(default=None, ge=6, le=22)
    expirationWarningDays: int | None = Field(default=None, ge=0, le=7)


class HouseholdResponse(BaseModel):
    id: int
    name: str
    inviteCode: str
    role: HouseholdRole
    notificationHour: int
    expirationWarningDays: int
    createdAt: datetime


class HouseholdMemberResponse(BaseModel):
    userId: int
    displayName: str
    role: HouseholdRole
    joinedAt: datetime


class JoinRequestResponse(BaseModel):
    id: int
    householdName: str
    isRejected: bool
    createdAt: datetime


class PendingJoinRequestResponse(BaseModel):
    id: int
    displayName: str
    maskedEmail: str
    createdAt: datetime


class InviteLinkResponse(BaseModel):
    id: int
    expiresAt: datetime
    createdAt: datetime


class CreatedInviteLinkResponse(InviteLinkResponse):
    token: str


class JoinByLinkRequest(BaseModel):
    token: str = Field(min_length=1, max_length=200)
