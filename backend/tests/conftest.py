import os
from pathlib import Path
from urllib.parse import urlparse

import psycopg
import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

testDatabaseUrl = os.environ["TEST_DATABASE_URL"]
testDatabaseName = urlparse(testDatabaseUrl).path.lstrip("/")
if not testDatabaseName.endswith("_test"):
    raise RuntimeError("The test database name must end with _test to protect real data")

os.environ["DATABASE_URL"] = testDatabaseUrl
os.environ["JWT_SECRET"] = "secret-used-only-in-automated-tests-0123456789"

from application.database import getEngine, getSessionFactory  # noqa: E402
from application.main import application  # noqa: E402
from application.models import Base  # noqa: E402


def createTestDatabaseIfMissing() -> None:
    maintenanceUrl = urlparse(testDatabaseUrl)._replace(path="/postgres").geturl()
    with psycopg.connect(maintenanceUrl, autocommit=True) as connection:
        exists = connection.execute(
            "SELECT 1 FROM pg_database WHERE datname = %s", (testDatabaseName,)
        ).fetchone()
        if not exists:
            connection.execute(f'CREATE DATABASE "{testDatabaseName}"')


@pytest.fixture(scope="session", autouse=True)
def migratedDatabase() -> None:
    createTestDatabaseIfMissing()
    with psycopg.connect(testDatabaseUrl, autocommit=True) as connection:
        connection.execute("DROP SCHEMA public CASCADE")
        connection.execute("CREATE SCHEMA public")
    command.upgrade(Config(str(Path(__file__).parent.parent / "alembic.ini")), "head")


@pytest.fixture(autouse=True)
def emptyTables(migratedDatabase: None) -> None:
    tableNames = ", ".join(table.name for table in Base.metadata.sorted_tables)
    with getEngine().begin() as connection:
        connection.exec_driver_sql(f"TRUNCATE TABLE {tableNames} RESTART IDENTITY CASCADE")


@pytest.fixture
def client() -> TestClient:
    return TestClient(application)


@pytest.fixture
def databaseSession() -> Session:
    with getSessionFactory()() as session:
        yield session
