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
  receiptConsentGivenAt: string | null;
  deletionScheduledAt: string | null;
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
  genericName: string | null;
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
  reservations: Reservation[];
}

export interface StockMovement {
  id: number;
  quantityChange: number;
  reason: StockMovementReason;
  userId: number | null;
  userDisplayName: string | null;
  createdAt: string;
}

export interface ScannedReceiptItem {
  originalText: string;
  name: string;
  genericName: string | null;
  category: FoodCategory;
  isFood: boolean;
  quantity: number | null;
  unit: MeasurementUnit | null;
  price: number;
  discount: number;
  suggestedFood: Food | null;
}

export interface ScannedReceipt {
  storeName: string | null;
  purchasedOn: string | null;
  totalAmount: number | null;
  itemsSum: number;
  itemsSumMatchesTotal: boolean;
  processingMilliseconds: number;
  items: ScannedReceiptItem[];
}

export interface SaveReceiptItem {
  originalText: string;
  name: string;
  category: FoodCategory;
  quantity: number | null;
  unit: MeasurementUnit | null;
  price: number;
  discount: number;
  correctedByUser: boolean;
  foodId: number | null;
  newFood: {
    name: string;
    genericName: string | null;
    category: FoodCategory;
    baseUnit: MeasurementUnit;
  } | null;
  addToStock: boolean;
  storageLocationId: number | null;
  expirationDate: string | null;
}

export interface ReceiptSummary {
  id: number;
  storeName: string | null;
  purchasedOn: string;
  totalAmount: number;
  itemsSumMatchesTotal: boolean;
  itemCount: number;
  uploadedByDisplayName: string | null;
  createdAt: string;
}

export interface ReceiptItem {
  id: number;
  originalText: string;
  name: string;
  category: FoodCategory;
  quantity: number | null;
  unit: MeasurementUnit | null;
  price: number;
  discount: number;
  correctedByUser: boolean;
  foodId: number | null;
  stockItemId: number | null;
}

export interface Receipt extends ReceiptSummary {
  items: ReceiptItem[];
}

export interface Reservation {
  id: number;
  stockItemId: number;
  foodName: string;
  userId: number;
  userDisplayName: string;
  recipeId: number | null;
  quantity: number;
  note: string | null;
  status: "active" | "fulfilled" | "cancelled";
  createdAt: string;
}

export interface RecipeSummary {
  id: number;
  name: string;
  servings: number;
  preparationMinutes: number | null;
  isPredefined: boolean;
  missingCount: number;
  createdAt: string;
}

export interface RecipeIngredient {
  id: number;
  food: Food;
  quantity: number;
  acceptsAnyOfKind: boolean;
  isOptional: boolean;
}

export interface Recipe extends RecipeSummary {
  instructions: string;
  ingredients: RecipeIngredient[];
}

export interface IngredientAvailability {
  ingredientId: number;
  food: Food;
  acceptsAnyOfKind: boolean;
  isOptional: boolean;
  requiredQuantity: number;
  availableQuantity: number;
  missingQuantity: number;
  reservedForRecipe: number;
  reservedByOthers: number;
  unitPrice: number | null;
  estimatedPrice: number | null;
}

export interface RecipeAvailability {
  recipeId: number;
  servings: number;
  missingCount: number;
  estimatedPrice: number | null;
  pricedIngredientCount: number;
  requiredIngredientCount: number;
  ingredients: IngredientAvailability[];
}

export interface RecipeIngredientRequest {
  foodId: number | null;
  newFood: {
    name: string;
    genericName: string | null;
    category: FoodCategory;
    baseUnit: MeasurementUnit;
  } | null;
  quantity: number;
  acceptsAnyOfKind: boolean;
  isOptional: boolean;
}

export interface RecipeRequest {
  name: string;
  servings: number;
  preparationMinutes: number | null;
  instructions: string;
  ingredients: RecipeIngredientRequest[];
}
