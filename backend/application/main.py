from fastapi import FastAPI

from application.routers import (
    authentication,
    foods,
    households,
    receipts,
    recipes,
    reservations,
    stock_items,
    storage_locations,
)

application = FastAPI(title="iShelf and Recipes")
application.include_router(authentication.router)
application.include_router(households.router)
application.include_router(storage_locations.router)
application.include_router(foods.router)
application.include_router(stock_items.router)
application.include_router(receipts.router)
application.include_router(reservations.router)
application.include_router(recipes.router)


@application.get("/health")
def getHealth() -> dict[str, str]:
    return {"status": "ok"}
