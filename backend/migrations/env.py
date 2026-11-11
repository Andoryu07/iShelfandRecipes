from alembic import context
from sqlalchemy import create_engine

from application.configuration import getConfiguration
from application.database import buildDatabaseUrl
from application.models import Base

targetMetadata = Base.metadata
databaseUrl = buildDatabaseUrl(getConfiguration().databaseUrl)


def runMigrationsOffline() -> None:
    context.configure(url=databaseUrl, target_metadata=targetMetadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def runMigrationsOnline() -> None:
    engine = create_engine(databaseUrl)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=targetMetadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    runMigrationsOffline()
else:
    runMigrationsOnline()
