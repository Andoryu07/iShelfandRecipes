import logging

from application.configuration import getConfiguration
from application.database import getSessionFactory
from application.notifications.expiration import sendExpirationNotifications
from application.notifications.push import PushSender, WebPushSender
from application.stock import todayInHouseholdTimeZone

logger = logging.getLogger(__name__)


def runDailyJobs(sender: PushSender | None = None, force: bool = False) -> None:
    with getSessionFactory()() as session:
        if getConfiguration().vapidPrivateKey:
            notified = sendExpirationNotifications(
                session, sender or WebPushSender(), todayInHouseholdTimeZone(), force=force
            )
            logger.info("Expiration notifications sent to %d households", notified)
        else:
            logger.info("Push notifications are not configured, skipping expiration notifications")
