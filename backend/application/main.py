import os

from fastapi import FastAPI

from application.routers import (
    authentication,
    foods,
    households,
    notifications,
    receipts,
    recipes,
    reservations,
    stock_items,
    storage_locations,
)

apiDocumentationEnabled = os.environ.get("API_DOCUMENTATION", "true").lower() != "false"
application = FastAPI(
    title="iShelf and Recipes",
    docs_url="/docs" if apiDocumentationEnabled else None,
    redoc_url="/redoc" if apiDocumentationEnabled else None,
    openapi_url="/openapi.json" if apiDocumentationEnabled else None,
)
application.include_router(authentication.router)
application.include_router(households.router)
application.include_router(storage_locations.router)
application.include_router(foods.router)
application.include_router(stock_items.router)
application.include_router(receipts.router)
application.include_router(reservations.router)
application.include_router(recipes.router)
application.include_router(notifications.router)


@application.get("/health")
def getHealth() -> dict[str, str]:
    return {"status": "ok"}
