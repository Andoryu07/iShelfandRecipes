import { apiRequest } from "./apiClient";
import type { Spending, UnhealthySpending } from "./types";

export function getSpending(householdId: number, month: string, monthCount: number): Promise<Spending> {
  return apiRequest<Spending>(
    `/households/${householdId}/statistics/spending?month=${month}&months=${monthCount}`,
  );
}

export function getUnhealthySpending(householdId: number, month: string): Promise<UnhealthySpending> {
  return apiRequest<UnhealthySpending>(
    `/households/${householdId}/statistics/unhealthy-spending?month=${month}&months=6`,
  );
}
