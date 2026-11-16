import { apiRequest } from "./apiClient";
import type { PlanSummary } from "./types";

export function getPlan(): Promise<PlanSummary> {
  return apiRequest<PlanSummary>("/auth/me/plan");
}

export function activateTestPremium(): Promise<PlanSummary> {
  return apiRequest<PlanSummary>("/auth/me/premium/test-activation", { method: "POST" });
}

export function cancelTestPremium(): Promise<PlanSummary> {
  return apiRequest<PlanSummary>("/auth/me/premium/test-activation", { method: "DELETE" });
}
