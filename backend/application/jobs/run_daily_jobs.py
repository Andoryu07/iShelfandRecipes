import logging
import sys

from application.jobs.daily import runScheduledJobs


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    runScheduledJobs(force="--force" in sys.argv)


if __name__ == "__main__":
    main()
