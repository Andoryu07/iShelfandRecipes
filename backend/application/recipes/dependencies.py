from fastapi import HTTPException, status

from application.configuration import getConfiguration
from application.recipes.gemini import GeminiRecipeReader
from application.recipes.reading import RecipeReader


def getRecipeReader() -> RecipeReader:
    configuration = getConfiguration()
    if not configuration.geminiApiKey:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Recipe reading is not configured")
    return GeminiRecipeReader(
        apiKey=configuration.geminiApiKey,
        modelName=configuration.geminiModel,
        thinkingLevel=configuration.geminiThinkingLevel,
        timeoutSeconds=configuration.geminiTimeoutSeconds,
    )
