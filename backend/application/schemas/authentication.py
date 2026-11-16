from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from application.schemas.common import RequiredName


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    displayName: str = Field(min_length=1, max_length=100)

    @field_validator("displayName")
    @classmethod
    def stripDisplayName(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Display name must not be blank")
        return stripped


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(max_length=128)


class DeleteAccountRequest(BaseModel):
    password: str = Field(max_length=128)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmation(BaseModel):
    token: str = Field(min_length=1, max_length=200)
    newPassword: str = Field(min_length=8, max_length=128)


class ChangePasswordRequest(BaseModel):
    currentPassword: str = Field(max_length=128)
    newPassword: str = Field(min_length=8, max_length=128)


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    accessTokenExpiresInSeconds: int


class UpgradeGuestRequest(RegisterRequest):
    pass


class GuestRequest(BaseModel):
    householdName: RequiredName


class UserResponse(BaseModel):
    id: int
    email: str | None
    isGuest: bool
    displayName: str
    receiptConsentGivenAt: datetime | None
    recipePhotoConsentGivenAt: datetime | None
    deletionScheduledAt: datetime | None
