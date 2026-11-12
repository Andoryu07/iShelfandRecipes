from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


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


class TokenResponse(BaseModel):
    accessToken: str
    tokenType: str = "bearer"
    accessTokenExpiresInSeconds: int


class UserResponse(BaseModel):
    id: int
    email: str
    displayName: str
    receiptConsentGivenAt: datetime | None
    deletionScheduledAt: datetime | None
