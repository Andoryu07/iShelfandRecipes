from collections.abc import Iterator
from functools import lru_cache

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from application.configuration import getConfiguration


def buildDatabaseUrl(databaseUrl: str) -> str:
    return databaseUrl.replace("postgresql://", "postgresql+psycopg://", 1)


@lru_cache
def getEngine() -> Engine:
    return create_engine(buildDatabaseUrl(getConfiguration().databaseUrl), pool_pre_ping=True)


@lru_cache
def getSessionFactory() -> sessionmaker[Session]:
    return sessionmaker(bind=getEngine(), expire_on_commit=False)


def getDatabaseSession() -> Iterator[Session]:
    with getSessionFactory()() as session:
        yield session
