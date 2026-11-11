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

export type MeasurementUnit = "gram" | "milliliter" | "piece";

export const foodCategories = [
  "dairy",
  "meatAndSausages",
  "fish",
  "fruit",
  "vegetables",
  "bakery",
  "dryGoods",
  "canned",
  "frozen",
  "beverages",
  "spices",
  "sweets",
  "other",
] as const;

export type FoodCategory = (typeof foodCategories)[number];

export type StockMovementReason = "eaten" | "spoiled" | "destroyed" | "cooked" | "correction";

export interface Food {
  id: number;
  name: string;
  category: FoodCategory;
  baseUnit: MeasurementUnit;
}

export interface StockItem {
  id: number;
  food: Food;
  storageLocationId: number;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  expirationDate: string | null;
  createdAt: string;
}

export interface StockMovement {
  id: number;
  quantityChange: number;
  reason: StockMovementReason;
  userId: number | null;
  userDisplayName: string | null;
  createdAt: string;
}
