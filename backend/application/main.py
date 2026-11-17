import os

from fastapi import FastAPI

from application.requestContext import currentRequest

from application.routers import (
    authentication,
    catalog,
    exports,
    foods,
    households,
    joining,
    notifications,
    plans,
    receipts,
    recipe_scans,
    recipes,
    reservations,
    shopping_list,
    statistics,
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


class RequestContextMiddleware:
    def __init__(self, application) -> None:
        self.application = application

    async def __call__(self, scope, receive, send) -> None:
        if scope["type"] != "http":
            await self.application(scope, receive, send)
            return
        token = currentRequest.set((scope["method"], scope["path"]))
        try:
            await self.application(scope, receive, send)
        finally:
            currentRequest.reset(token)


application.add_middleware(RequestContextMiddleware)
application.include_router(plans.router)
application.include_router(authentication.router)
application.include_router(joining.router)
application.include_router(households.router)
application.include_router(storage_locations.router)
application.include_router(foods.router)
application.include_router(stock_items.router)
application.include_router(receipts.router)
application.include_router(reservations.router)
application.include_router(recipe_scans.router)
application.include_router(recipes.router)
application.include_router(notifications.router)
application.include_router(statistics.router)
application.include_router(exports.router)
application.include_router(catalog.router)
application.include_router(shopping_list.router)


@application.get("/health")
def getHealth() -> dict[str, str]:
    return {"status": "ok"}
