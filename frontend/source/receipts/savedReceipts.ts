import { ApiError } from "../api/apiClient";
import type { SavedReceiptReference } from "../api/types";
import { formatDate } from "../translations/cs";
import { formatMoney } from "./money";

export function describeSavedReceipt(receipt: SavedReceiptReference): string {
  return [formatDate(receipt.purchasedOn), receipt.storeName, formatMoney(receipt.totalAmount)]
    .filter(Boolean)
    .join(", ");
}

export function sameFileReceipt(error: unknown): SavedReceiptReference | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }
  const detail = error.detail as { code?: string; receipt?: SavedReceiptReference } | undefined;
  return detail?.code === "sameFile" && detail.receipt ? detail.receipt : null;
}
