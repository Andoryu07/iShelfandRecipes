from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.database import getDatabaseSession
from application.dependencies import getCurrentUser
from application.models import PushSubscription, User
from application.notifications.push import PushSender, getPushSender, sendToSubscriptions
from application.schemas.notifications import (
    CreatePushSubscriptionRequest,
    DeletePushSubscriptionRequest,
    TestPushRequest,
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


@router.post("/push-subscriptions/test", status_code=status.HTTP_204_NO_CONTENT)
def sendTestNotification(
    request: TestPushRequest,
    user: User = Depends(getCurrentUser),
    session: Session = Depends(getDatabaseSession),
    sender: PushSender = Depends(getPushSender),
) -> Response:
    if not getConfiguration().vapidPrivateKey:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Push notifications are not configured")
    subscription = session.scalar(
        select(PushSubscription).where(PushSubscription.endpoint == request.endpoint, PushSubscription.userId == user.id)
    )
    if subscription is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Push subscription not found")
    delivered = sendToSubscriptions(session, sender, [subscription], {"type": "test"})
    session.commit()
    if not delivered:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="The browser cancelled the subscription")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
