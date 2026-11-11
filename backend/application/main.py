from fastapi import FastAPI

from application.routers import authentication

application = FastAPI(title="iShelf and Recipes")
application.include_router(authentication.router)


@application.get("/health")
def getHealth() -> dict[str, str]:
    return {"status": "ok"}
