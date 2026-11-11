from fastapi import FastAPI

from application.routers import authentication, households

application = FastAPI(title="iShelf and Recipes")
application.include_router(authentication.router)
application.include_router(households.router)


@application.get("/health")
def getHealth() -> dict[str, str]:
    return {"status": "ok"}
