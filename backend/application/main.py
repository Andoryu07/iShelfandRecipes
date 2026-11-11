from fastapi import FastAPI

application = FastAPI(title="iShelf and Recipes")


@application.get("/health")
def getHealth() -> dict[str, str]:
    return {"status": "ok"}
