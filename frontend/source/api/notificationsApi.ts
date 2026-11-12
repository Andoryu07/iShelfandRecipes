import { apiRequest } from "./apiClient";

export function getPushPublicKey(): Promise<{ publicKey: string }> {
  return apiRequest<{ publicKey: string }>("/push/public-key");
}

export function savePushSubscription(subscription: PushSubscriptionJSON): Promise<void> {
  return apiRequest<void>("/push-subscriptions", {
    method: "POST",
    body: { endpoint: subscription.endpoint, keys: subscription.keys },
  });
}

export function deletePushSubscription(endpoint: string): Promise<void> {
  return apiRequest<void>("/push-subscriptions", { method: "DELETE", body: { endpoint } });
}
