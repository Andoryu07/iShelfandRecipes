import logging
import time
from datetime import datetime, timedelta

from application.jobs.daily import runScheduledJobs
from application.stock import householdTimeZone

logger = logging.getLogger(__name__)
retrySeconds = 60


def nextRunAfter(moment: datetime) -> datetime:
    return moment.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    runAt = datetime.now(householdTimeZone)
    while True:
        waitSeconds = (runAt - datetime.now(householdTimeZone)).total_seconds()
        if waitSeconds > 0:
            logger.info("Next scheduled jobs at %s", runAt.isoformat())
            time.sleep(waitSeconds)
        try:
            runScheduledJobs()
            runAt = nextRunAfter(datetime.now(householdTimeZone))
        except Exception:
            logger.exception("Scheduled jobs failed, retrying in %d seconds", retrySeconds)
            runAt = datetime.now(householdTimeZone) + timedelta(seconds=retrySeconds)


if __name__ == "__main__":
    main()
