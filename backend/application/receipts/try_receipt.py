import json
import mimetypes
import sys
from decimal import Decimal
from pathlib import Path

from application.configuration import getConfiguration
from application.receipts.dependencies import getReceiptReader
from application.receipts.reading import ReceiptReadingError
from application.receipts.scanning import expandItem, formatStoreName, sumTolerance, toMoney


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Usage: python -m application.receipts.try_receipt <path to receipt photo or PDF>")
    imagePath = Path(sys.argv[1])
    mimeType = mimetypes.guess_type(imagePath.name)[0] or "image/jpeg"
    configuration = getConfiguration()
    if not configuration.geminiApiKey:
        sys.exit("GEMINI_API_KEY is not set in .env")
    print(f"Model {configuration.geminiModel}, thinking {configuration.geminiThinkingLevel}, {mimeType}")

    try:
        result = getReceiptReader().readReceipt(imagePath.read_bytes(), mimeType)
    except ReceiptReadingError as error:
        sys.exit(f"Reading failed: {error}")
    receipt = result.receipt
    print(json.dumps(receipt.model_dump(mode="json"), ensure_ascii=False, indent=2))

    print(f"\nTime {result.processingMilliseconds} ms, tokens {result.inputTokens} in, {result.outputTokens} out")
    itemsSum = sum((toMoney(item.price) for item in receipt.items), Decimal("0.00"))
    total = toMoney(receipt.totalAmount) if receipt.totalAmount is not None else None
    matches = total is not None and abs(itemsSum - total) <= sumTolerance
    print(f"Store {formatStoreName(receipt.storeName)}, purchased on {receipt.purchasedOn}")
    print(f"Items sum {itemsSum}, total {total}, sum matches: {matches}")
    print("\nItems after splitting packages:")
    for item in receipt.items:
        for expanded in expandItem(item):
            quantity = f"{expanded['quantity']} {expanded['unit'].value}" if expanded["quantity"] is not None else "?"
            foodMark = "" if expanded["isFood"] else " (not food)"
            print(
                f"  {expanded['originalText']} -> {expanded['name']} ({expanded['genericName']}): "
                f"{quantity}, {expanded['price']} CZK{foodMark}"
            )


if __name__ == "__main__":
    main()
