export type HouseholdRole = "owner" | "member";
export type StorageLocationKind = "fridge" | "freezer" | "pantry" | "custom";

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  accessTokenExpiresInSeconds: number;
}

export interface User {
  id: number;
  email: string;
  displayName: string;
}

export interface Household {
  id: number;
  name: string;
  inviteCode: string;
  role: HouseholdRole;
  createdAt: string;
}

export interface HouseholdMember {
  userId: number;
  displayName: string;
  role: HouseholdRole;
  joinedAt: string;
}

export interface StorageLocation {
  id: number;
  householdId: number;
  name: string;
  kind: StorageLocationKind;
}
