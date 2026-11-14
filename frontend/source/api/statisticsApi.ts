import { apiRequest } from "./apiClient";
import type { Spending } from "./types";

export function getSpending(householdId: number, month: string, monthCount: number): Promise<Spending> {
  return apiRequest<Spending>(
    `/households/${householdId}/statistics/spending?month=${month}&months=${monthCount}`,
  );
}
