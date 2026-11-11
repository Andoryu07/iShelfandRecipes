FROM python:3.13-slim

WORKDIR /backend

ARG INSTALL_DEVELOPMENT=false

COPY requirements.txt requirements-development.txt ./
RUN if [ "$INSTALL_DEVELOPMENT" = "true" ]; \
    then pip install --no-cache-dir -r requirements-development.txt; \
    else pip install --no-cache-dir -r requirements.txt; fi

COPY alembic.ini ./
COPY migrations ./migrations
COPY application ./application

CMD ["sh", "-c", "alembic upgrade head && uvicorn application.main:application --host 0.0.0.0 --port 8000"]
