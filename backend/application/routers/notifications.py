from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.database import getDatabaseSession
from application.dependencies import getCurrentUser
from application.models import PushSubscription, User
from application.schemas.notifications import (
    CreatePushSubscriptionRequest,
    DeletePushSubscriptionRequest,
    PublicKeyResponse,
)

router = APIRouter(tags=["notifications"])


@router.get("/push/public-key", response_model=PublicKeyResponse)
def getPublicKey() -> PublicKeyResponse:
    publicKey = getConfiguration().vapidPublicKey
    if not publicKey:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Push notifications are not configured")
    return PublicKeyResponse(publicKey=publicKey)


@router.post("/push-subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def createPushSubscription(
    request: CreatePushSubscriptionRequest,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    subscription = session.scalar(select(PushSubscription).where(PushSubscription.endpoint == request.endpoint))
    if subscription is None:
        subscription = PushSubscription(endpoint=request.endpoint)
        session.add(subscription)
    subscription.userId = user.id
    subscription.publicKey = request.keys.p256dh
    subscription.authenticationSecret = request.keys.auth
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/push-subscriptions", status_code=status.HTTP_204_NO_CONTENT)
def deletePushSubscription(
    request: DeletePushSubscriptionRequest,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
) -> Response:
    session.execute(
        delete(PushSubscription).where(
            PushSubscription.endpoint == request.endpoint, PushSubscription.userId == user.id
        )
    )
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
