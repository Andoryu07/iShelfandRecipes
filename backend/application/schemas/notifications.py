from pydantic import BaseModel, Field


class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=1, max_length=200)
    auth: str = Field(min_length=1, max_length=100)


class CreatePushSubscriptionRequest(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2000)
    keys: PushSubscriptionKeys


class DeletePushSubscriptionRequest(BaseModel):
    endpoint: str = Field(min_length=1, max_length=2000)


class PublicKeyResponse(BaseModel):
    publicKey: str
