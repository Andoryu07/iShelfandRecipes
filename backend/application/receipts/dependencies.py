from fastapi import HTTPException, status

from application.configuration import getConfiguration
from application.receipts.gemini import GeminiReceiptReader
from application.receipts.reading import ReceiptReader


def getReceiptReader() -> ReceiptReader:
    configuration = getConfiguration()
    if not configuration.geminiApiKey:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Receipt reading is not configured")
    return GeminiReceiptReader(
        apiKey=configuration.geminiApiKey,
        modelName=configuration.geminiModel,
        thinkingLevel=configuration.geminiThinkingLevel,
        timeoutSeconds=configuration.geminiTimeoutSeconds,
    )
