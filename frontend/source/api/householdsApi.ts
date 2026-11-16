import { apiRequest } from "./apiClient";
import type {
  ReceiptItemExportRow,
  Household,
  InviteLink,
  JoinRequest,
  PendingJoinRequest,
  HouseholdMember,
  StorageLocation,
  StorageLocationHistoryEvent,
  StorageLocationKind,
} from "./types";

export function listHouseholds(): Promise<Household[]> {
  return apiRequest<Household[]>("/households");
}

export function createHousehold(name: string): Promise<Household> {
  return apiRequest<Household>("/households", { method: "POST", body: { name } });
}

export function requestToJoinHousehold(inviteCode: string): Promise<JoinRequest> {
  return apiRequest<JoinRequest>("/households/join", { method: "POST", body: { inviteCode } });
}

export function getOwnJoinRequest(): Promise<JoinRequest | null> {
  return apiRequest<JoinRequest | null>("/join-requests/mine");
}

export function cancelOwnJoinRequest(): Promise<void> {
  return apiRequest<void>("/join-requests/mine", { method: "DELETE" });
}

export function listJoinRequests(householdId: number): Promise<PendingJoinRequest[]> {
  return apiRequest<PendingJoinRequest[]>(`/households/${householdId}/join-requests`);
}

export function decideJoinRequest(requestId: number, decision: "approve" | "reject"): Promise<void> {
  return apiRequest<void>(`/join-requests/${requestId}/${decision}`, { method: "POST" });
}

export function createInviteLink(householdId: number): Promise<InviteLink & { token: string }> {
  return apiRequest(`/households/${householdId}/invite-links`, { method: "POST" });
}

export function listInviteLinks(householdId: number): Promise<InviteLink[]> {
  return apiRequest<InviteLink[]>(`/households/${householdId}/invite-links`);
}

export function revokeInviteLink(linkId: number): Promise<void> {
  return apiRequest<void>(`/invite-links/${linkId}`, { method: "DELETE" });
}

export function joinHouseholdByLink(token: string): Promise<Household> {
  return apiRequest<Household>("/households/join-by-link", { method: "POST", body: { token } });
}

export function updateNotificationSettings(
  householdId: number,
  settings: { notificationHour?: number; expirationWarningDays?: number },
): Promise<Household> {
  return apiRequest<Household>(`/households/${householdId}/notification-settings`, {
    method: "PATCH",
    body: settings,
  });
}

export function regenerateInviteCode(householdId: number): Promise<Household> {
  return apiRequest<Household>(`/households/${householdId}/invite-code`, { method: "POST" });
}

export function listMembers(householdId: number): Promise<HouseholdMember[]> {
  return apiRequest<HouseholdMember[]>(`/households/${householdId}/members`);
}

export function removeMember(householdId: number, userId: number): Promise<void> {
  return apiRequest<void>(`/households/${householdId}/members/${userId}`, { method: "DELETE" });
}

export function listStorageLocations(householdId: number): Promise<StorageLocation[]> {
  return apiRequest<StorageLocation[]>(`/households/${householdId}/storage-locations`);
}

export function createStorageLocation(
  householdId: number,
  name: string,
  kind: StorageLocationKind,
): Promise<StorageLocation> {
  return apiRequest<StorageLocation>(`/households/${householdId}/storage-locations`, {
    method: "POST",
    body: { name, kind },
  });
}

export function renameStorageLocation(storageLocationId: number, name: string): Promise<StorageLocation> {
  return apiRequest<StorageLocation>(`/storage-locations/${storageLocationId}`, {
    method: "PATCH",
    body: { name },
  });
}

export function changeStorageLocationIcon(
  storageLocationId: number,
  icon: string | null,
): Promise<StorageLocation> {
  return apiRequest<StorageLocation>(`/storage-locations/${storageLocationId}`, {
    method: "PATCH",
    body: { icon },
  });
}

export function getStorageLocationHistory(storageLocationId: number): Promise<StorageLocationHistoryEvent[]> {
  return apiRequest<StorageLocationHistoryEvent[]>(`/storage-locations/${storageLocationId}/history`);
}

export function deleteStorageLocation(storageLocationId: number): Promise<void> {
  return apiRequest<void>(`/storage-locations/${storageLocationId}`, { method: "DELETE" });
}

export function exportReceiptItems(householdId: number): Promise<ReceiptItemExportRow[]> {
  return apiRequest<ReceiptItemExportRow[]>(`/households/${householdId}/exports/receipt-items`);
}
