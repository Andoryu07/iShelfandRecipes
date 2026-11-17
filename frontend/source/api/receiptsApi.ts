import { apiRequest } from "./apiClient";
import type { Receipt, ReceiptSummary, SaveReceiptItem, ScannedReceipt } from "./types";

export function scanReceipt(
  householdId: number,
  file: Blob,
  fileName: string,
  ignoreSameFile = false,
): Promise<ScannedReceipt> {
  const formData = new FormData();
  formData.append("file", file, fileName);
  const query = ignoreSameFile ? "?ignoreSameFile=true" : "";
  return apiRequest<ScannedReceipt>(`/households/${householdId}/receipts/scan${query}`, {
    method: "POST",
    body: formData,
  });
}

export function saveReceipt(
  householdId: number,
  receipt: {
    storeName: string | null;
    purchasedOn: string;
    totalAmount: number;
    processingMilliseconds: number | null;
    receiptNumber?: string | null;
    fileHash?: string | null;
    items: SaveReceiptItem[];
  },
): Promise<Receipt> {
  return apiRequest<Receipt>(`/households/${householdId}/receipts`, { method: "POST", body: receipt });
}

export function listReceipts(householdId: number): Promise<ReceiptSummary[]> {
  return apiRequest<ReceiptSummary[]>(`/households/${householdId}/receipts`);
}

export function getReceipt(receiptId: number): Promise<Receipt> {
  return apiRequest<Receipt>(`/receipts/${receiptId}`);
}
