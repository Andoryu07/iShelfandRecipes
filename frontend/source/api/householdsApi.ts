import { apiRequest } from "./apiClient";
import type {
  Household,
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

export function joinHousehold(inviteCode: string): Promise<Household> {
  return apiRequest<Household>("/households/join", { method: "POST", body: { inviteCode } });
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
