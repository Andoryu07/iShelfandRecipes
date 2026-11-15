import time

from google import genai
from google.genai import types

from application.recipes.reading import ExtractedRecipe, RecipeReadingError, RecipeReadingResult

instructions = """You digitize Czech recipes from photos of cookbook pages (one recipe on one or more pictures).
Fill in the schema for the one recipe shown. If there are several recipes, take the one that is complete on
the pictures, or the first one.
Rules:
- Keep the wording of the method, only split it into steps and fix obvious hyphenation at line ends.
- Convert every amount to grams, milliliters or pieces. Typical conversions: 1 lžíce flour 10 g, 1 lžíce sugar
  15 g, 1 lžíce oil or water 15 ml, 1 lžička 5 g or 5 ml, 1 špetka 1 g, 1 hrnek 250 ml, 1 balíček prášku do
  pečiva 12 g, 1 balíček vanilkového cukru 8 g, 1 stroužek česneku 1 piece.
- Use pieces for eggs, onions, garlic cloves, rolls, lemons and similar countable foods.
- Do not invent ingredients, amounts, servings or times. Use null when they are not printed.
- When the pictures do not show a recipe, set isRecipe to false and leave the lists empty.
"""


class GeminiRecipeReader:
    def __init__(self, apiKey: str, modelName: str, thinkingLevel: str, timeoutSeconds: int) -> None:
        self.client = genai.Client(api_key=apiKey, http_options=types.HttpOptions(timeout=timeoutSeconds * 1000))
        self.modelName = modelName
        self.thinkingLevel = thinkingLevel

    def readRecipe(self, files: list[tuple[bytes, str]]) -> RecipeReadingResult:
        startTime = time.perf_counter()
        try:
            response = self.client.models.generate_content(
                model=self.modelName,
                contents=[types.Part.from_bytes(data=content, mime_type=mimeType) for content, mimeType in files],
                config=types.GenerateContentConfig(
                    system_instruction=instructions,
                    response_mime_type="application/json",
                    response_schema=ExtractedRecipe,
                    temperature=0.0,
                    thinking_config=types.ThinkingConfig(thinking_level=self.thinkingLevel.upper()),
                ),
            )
        except Exception as error:
            raise RecipeReadingError(str(error)) from error
        processingMilliseconds = round((time.perf_counter() - startTime) * 1000)
        recipe = response.parsed
        if not isinstance(recipe, ExtractedRecipe):
            try:
                recipe = ExtractedRecipe.model_validate_json(response.text or "")
            except ValueError as error:
                raise RecipeReadingError("The model returned an invalid recipe") from error
        usage = response.usage_metadata
        return RecipeReadingResult(
            recipe=recipe,
            processingMilliseconds=processingMilliseconds,
            inputTokens=usage.prompt_token_count if usage else None,
            outputTokens=usage.candidates_token_count if usage else None,
        )
