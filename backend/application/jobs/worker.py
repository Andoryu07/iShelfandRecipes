import logging
import time
from datetime import datetime, timedelta

from application.jobs.daily import runDailyJobs
from application.stock import householdTimeZone

logger = logging.getLogger(__name__)
dailyJobHour = 8
retrySeconds = 60


def nextRunAfter(moment: datetime) -> datetime:
    todayRun = moment.replace(hour=dailyJobHour, minute=0, second=0, microsecond=0)
    return todayRun if moment < todayRun else todayRun + timedelta(days=1)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    now = datetime.now(householdTimeZone)
    runAt = now if now.hour >= dailyJobHour else nextRunAfter(now)
    while True:
        waitSeconds = (runAt - datetime.now(householdTimeZone)).total_seconds()
        if waitSeconds > 0:
            logger.info("Next daily jobs at %s", runAt.isoformat())
            time.sleep(waitSeconds)
        try:
            runDailyJobs()
            runAt = nextRunAfter(datetime.now(householdTimeZone))
        except Exception:
            logger.exception("Daily jobs failed, retrying in %d seconds", retrySeconds)
            runAt = datetime.now(householdTimeZone) + timedelta(seconds=retrySeconds)


if __name__ == "__main__":
    main()
