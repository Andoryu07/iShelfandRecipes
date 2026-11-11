import os
from dataclasses import dataclass
from functools import lru_cache


@dataclass(frozen=True)
class Configuration:
    databaseUrl: str
    jsonWebTokenSecret: str
    accessTokenLifetimeMinutes: int = 30
    refreshTokenLifetimeDays: int = 60


@lru_cache
def getConfiguration() -> Configuration:
    return Configuration(
        databaseUrl=os.environ["DATABASE_URL"],
        jsonWebTokenSecret=os.environ["JWT_SECRET"],
    )
