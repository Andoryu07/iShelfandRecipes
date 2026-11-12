import time

from google import genai
from google.genai import types

from application.receipts.reading import ExtractedReceipt, ReceiptReadingError, ReceiptReadingResult

instructions = """You digitize Czech grocery receipts.
Read every purchased line of the receipt (a photo or a PDF) and fill in the schema.
Rules:
- Copy the product name into originalText character by character, do not fix typos or abbreviations.
  Quantity, price and discount lines are not part of it, they go into their own fields.
- Prices are in CZK. price is what was finally charged for the whole line, after the discount of that line.
- A discount printed under an item belongs to that item: lower its price and fill in discount.
- Some stores print the quantity line (for example "2 x 11.90") above the item instead of below it. Join it
  with the item whose price equals the quantity times the unit price.
- Every other negative amount is a discount for the whole purchase, even without a name and even when it is
  printed next to the name of a card, coupon or loyalty programme (for example "-20,00"). Add it as a separate
  line with that negative price and isFood false. The items together with these discounts must add up to the
  total.
- Payments are not items: positive amounts paid by cash, card, gift card or voucher, card balances
  ("Zůstatek") and change. Ignore them, as well as VAT summaries and loyalty points.
- purchasedOn is the date of the purchase, usually printed near the time and the register number
  (for example "Datum 13.08.26 21:12" means 2026-08-13). Never use validity or expiry dates ("Platnost do").
- Do not invent lines, quantities or dates. Use null when something is not printed or not readable.
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

    def readReceipt(self, content: bytes, mimeType: str) -> ReceiptReadingResult:
        startTime = time.perf_counter()
        try:
            response = self.client.models.generate_content(
                model=self.modelName,
                contents=[types.Part.from_bytes(data=content, mime_type=mimeType)],
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
