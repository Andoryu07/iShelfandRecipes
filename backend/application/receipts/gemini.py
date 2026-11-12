import time

from google import genai
from google.genai import types

from application.receipts.reading import ExtractedReceipt, ReceiptReadingError, ReceiptReadingResult

instructions = """You digitize Czech grocery receipts.
Read every purchased line of the receipt in the image and fill in the schema.
Rules:
- Copy originalText character by character, do not fix typos or abbreviations.
- Prices are in CZK. price is what was finally charged for the whole line, after the discount of that line.
- A discount printed under an item belongs to that item: lower its price and fill in discount.
- Do not invent lines, quantities or dates. Use null when something is not printed or not readable.
- Ignore payment lines, VAT summaries, change and loyalty points.
"""


class GeminiReceiptReader:
    def __init__(self, apiKey: str, modelName: str, thinkingLevel: str, timeoutSeconds: int) -> None:
        self.client = genai.Client(
            api_key=apiKey, http_options=types.HttpOptions(timeout=timeoutSeconds * 1000)
        )
        self.modelName = modelName
        self.thinkingLevel = thinkingLevel

    def buildConfiguration(self) -> types.GenerateContentConfig:
        return types.GenerateContentConfig(
            system_instruction=instructions,
            response_mime_type="application/json",
            response_schema=ExtractedReceipt,
            temperature=0.0,
            thinking_config=types.ThinkingConfig(thinking_level=self.thinkingLevel.upper()),
        )

    def readReceipt(self, image: bytes, mimeType: str) -> ReceiptReadingResult:
        startTime = time.perf_counter()
        try:
            response = self.client.models.generate_content(
                model=self.modelName,
                contents=[types.Part.from_bytes(data=image, mime_type=mimeType)],
                config=self.buildConfiguration(),
            )
        except Exception as error:
            raise ReceiptReadingError(str(error)) from error
        processingMilliseconds = round((time.perf_counter() - startTime) * 1000)
        receipt = response.parsed
        if not isinstance(receipt, ExtractedReceipt):
            try:
                receipt = ExtractedReceipt.model_validate_json(response.text or "")
            except ValueError as error:
                raise ReceiptReadingError("The model returned an invalid receipt") from error
        usage = response.usage_metadata
        return ReceiptReadingResult(
            receipt=receipt,
            processingMilliseconds=processingMilliseconds,
            inputTokens=usage.prompt_token_count if usage else None,
            outputTokens=usage.candidates_token_count if usage else None,
        )
