import logging
import sys

from application.jobs.daily import runDailyJobs


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    runDailyJobs(force="--force" in sys.argv)


if __name__ == "__main__":
    main()
