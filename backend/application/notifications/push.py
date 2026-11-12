import json
import logging
from typing import Protocol

from pywebpush import WebPushException, webpush
from sqlalchemy import delete
from sqlalchemy.orm import Session

from application.configuration import getConfiguration
from application.models import PushSubscription

logger = logging.getLogger(__name__)
expiredSubscriptionStatuses = {404, 410}


class PushSender(Protocol):
    def send(self, subscription: PushSubscription, payload: dict) -> bool: ...


class WebPushSender:
    def send(self, subscription: PushSubscription, payload: dict) -> bool:
        configuration = getConfiguration()
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.publicKey, "auth": subscription.authenticationSecret},
                },
                data=json.dumps(payload),
                vapid_private_key=configuration.vapidPrivateKey,
                vapid_claims={"sub": configuration.vapidSubject},
                ttl=12 * 60 * 60,
                timeout=10,
            )
            return True
        except WebPushException as error:
            statusCode = error.response.status_code if error.response is not None else None
            if statusCode in expiredSubscriptionStatuses:
                return False
            logger.warning("Push notification failed: %s", error)
            return True


def sendToSubscriptions(
    session: Session, sender: PushSender, subscriptions: list[PushSubscription], payload: dict
) -> int:
    expiredIds = [subscription.id for subscription in subscriptions if not sender.send(subscription, payload)]
    if expiredIds:
        session.execute(delete(PushSubscription).where(PushSubscription.id.in_(expiredIds)))
    return len(subscriptions) - len(expiredIds)
