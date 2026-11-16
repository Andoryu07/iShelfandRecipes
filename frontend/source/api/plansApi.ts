import { apiRequest } from "./apiClient";
import type { PlanSummary, RewardKind } from "./types";

export function getPlan(): Promise<PlanSummary> {
  return apiRequest<PlanSummary>("/auth/me/plan");
}

export function activateTestPremium(): Promise<PlanSummary> {
  return apiRequest<PlanSummary>("/auth/me/premium/test-activation", { method: "POST" });
}

export function cancelTestPremium(): Promise<PlanSummary> {
  return apiRequest<PlanSummary>("/auth/me/premium/test-activation", { method: "DELETE" });
}

export function recordRewardedAd(kind: RewardKind): Promise<PlanSummary> {
  return apiRequest<PlanSummary>("/auth/me/rewarded-ads", { method: "POST", body: { kind } });
}
