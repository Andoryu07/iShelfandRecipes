from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest

from application.receipts.gemini import GeminiReceiptReader
from application.receipts.reading import ExtractedReceipt, ReceiptReadingError

parsedReceipt = ExtractedReceipt(storeName="Tesco", purchasedOn="2026-11-01", totalAmount=10, items=[])


def readerWithFakeClient(response=None, error: Exception | None = None):
    with patch("application.receipts.gemini.genai.Client") as clientClass:
        fakeClient = MagicMock()
        clientClass.return_value = fakeClient
        if error:
            fakeClient.models.generate_content.side_effect = error
        else:
            fakeClient.models.generate_content.return_value = response
        reader = GeminiReceiptReader(apiKey="test-key", modelName="gemini-test", thinkingLevel="minimal", timeoutSeconds=60)
    return reader, fakeClient, clientClass


def test_sendsTheImageWithSchemaAndSettings() -> None:
    response = SimpleNamespace(
        parsed=parsedReceipt, text=None, usage_metadata=SimpleNamespace(prompt_token_count=900, candidates_token_count=150)
    )
    reader, fakeClient, clientClass = readerWithFakeClient(response)

    result = reader.readReceipt(b"image bytes", "image/jpeg")

    assert clientClass.call_args.kwargs["api_key"] == "test-key"
    assert clientClass.call_args.kwargs["http_options"].timeout == 60_000
    arguments = fakeClient.models.generate_content.call_args.kwargs
    assert arguments["model"] == "gemini-test"
    assert arguments["contents"][0].inline_data.data == b"image bytes"
    assert arguments["contents"][0].inline_data.mime_type == "image/jpeg"
    configuration = arguments["config"]
    assert configuration.response_schema is ExtractedReceipt
    assert configuration.response_mime_type == "application/json"
    assert configuration.temperature == 0.0
    assert configuration.thinking_config.thinking_level.value == "MINIMAL"
    assert result.receipt == parsedReceipt
    assert (result.inputTokens, result.outputTokens) == (900, 150)
    assert result.processingMilliseconds >= 0


def test_fallsBackToParsingTheText() -> None:
    response = SimpleNamespace(parsed=None, text=parsedReceipt.model_dump_json(), usage_metadata=None)
    reader, _, _ = readerWithFakeClient(response)

    assert reader.readReceipt(b"image", "image/png").receipt == parsedReceipt


def test_invalidResponseAndApiErrorsBecomeReadingErrors() -> None:
    reader, _, _ = readerWithFakeClient(SimpleNamespace(parsed=None, text="not json", usage_metadata=None))
    with pytest.raises(ReceiptReadingError):
        reader.readReceipt(b"image", "image/png")

    reader, _, _ = readerWithFakeClient(error=TimeoutError("timed out"))
    with pytest.raises(ReceiptReadingError):
        reader.readReceipt(b"image", "image/png")
