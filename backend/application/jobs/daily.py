import logging
from datetime import datetime, timezone

from application.accounts import purgeAccountsPendingDeletion
from application.configuration import getConfiguration
from application.database import getSessionFactory
from application.notifications.expiration import sendExpirationNotifications
from application.notifications.push import PushSender, WebPushSender
from application.stock import householdTimeZone

logger = logging.getLogger(__name__)


def runScheduledJobs(sender: PushSender | None = None, force: bool = False) -> None:
    with getSessionFactory()() as session:
        purged = purgeAccountsPendingDeletion(session, datetime.now(timezone.utc))
        logger.info("Deleted %d accounts after the deletion period", purged)
        if getConfiguration().vapidPrivateKey:
            notified = sendExpirationNotifications(
                session, sender or WebPushSender(), datetime.now(householdTimeZone), force=force
            )
            logger.info("Expiration notifications sent to %d members", notified)
        else:
            logger.info("Push notifications are not configured, skipping expiration notifications")
