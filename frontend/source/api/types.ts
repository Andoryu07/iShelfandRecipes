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
  recipePhotoConsentGivenAt?: string | null;
  deletionScheduledAt: string | null;
}

export interface Household {
  id: number;
  name: string;
  inviteCode: string;
  role: HouseholdRole;
  notificationHour: number;
  expirationWarningDays: number;
  createdAt: string;
}

export interface JoinRequest {
  id: number;
  householdName: string;
  isRejected: boolean;
  createdAt: string;
}

export interface PendingJoinRequest {
  id: number;
  displayName: string;
  maskedEmail: string;
  createdAt: string;
}

export interface InviteLink {
  id: number;
  expiresAt: string;
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
  icon?: string | null;
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

export type StockMovementReason = "eaten" | "spoiled" | "destroyed" | "cooked" | "correction" | "moved";

export interface Food {
  id: number;
  name: string;
  genericName: string | null;
  category: FoodCategory;
  baseUnit: MeasurementUnit;
  icon?: string | null;
  photoUrl?: string | null;
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
  storageLocationId: number | null;
  targetStorageLocationId: number | null;
  createdAt: string;
}

export type StorageLocationHistoryKind =
  Exclude<StockMovementReason, "moved"> | "added" | "movedIn" | "movedOut";

export interface StorageLocationHistoryEvent {
  kind: StorageLocationHistoryKind;
  food: Food;
  quantity: number | null;
  userDisplayName: string | null;
  otherStorageLocationId: number | null;
  createdAt: string;
}

export interface RecipeCooking {
  id: number;
  servings: number;
  userDisplayName: string | null;
  createdAt: string;
}

export interface HouseholdCooking {
  id: number;
  recipeId: number | null;
  recipeName: string;
  recipeIcon: string | null;
  recipeIsPredefined: boolean;
  servings: number;
  userDisplayName: string | null;
  createdAt: string;
}

export interface ShoppingListItem {
  id: number;
  food: Food | null;
  name: string;
  quantity: number | null;
  note: string | null;
  isPersonal: boolean;
  isChecked: boolean;
  recipeId: number | null;
  recipeName: string | null;
  createdByDisplayName: string | null;
  checkedByDisplayName: string | null;
  createdAt: string;
}

export interface ScannedIngredient {
  originalText: string;
  name: string;
  genericName: string | null;
  category: FoodCategory;
  quantity: number | null;
  unit: MeasurementUnit | null;
  isOptional: boolean;
  suggestedFood: Food | null;
}

export interface ScannedRecipe {
  name: string;
  servings: number;
  preparationMinutes: number | null;
  dishType: DishType | null;
  isVegetarian: boolean;
  instructions: string;
  ingredients: ScannedIngredient[];
  usedScans: number;
  scanLimit: number;
  scanPeriod: ScanPeriod;
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
  rememberedFromEarlierReceipt?: boolean;
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

export const dishTypes = ["soup", "mainCourse", "sideDish", "dessert", "breakfast"] as const;

export type DishType = (typeof dishTypes)[number];

export interface RecipeSummary {
  id: number;
  name: string;
  servings: number;
  preparationMinutes: number | null;
  isPredefined: boolean;
  isFavourite?: boolean;
  icon?: string | null;
  dishType?: DishType | null;
  isVegetarian?: boolean;
  missingCount: number;
  expiringIngredientCount?: number;
  estimatedPrice?: number | null;
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
  icon: string | null;
  dishType: DishType | null;
  isVegetarian: boolean;
  ingredients: RecipeIngredientRequest[];
}

export interface Spending {
  month: string;
  monthTotal: number;
  previousMonthTotal: number;
  receiptCount: number;
  discountsTotal: number;
  months: { month: string; total: number; receiptCount: number }[];
  stores: { storeName: string | null; total: number; receiptCount: number }[];
  categories: { category: FoodCategory; total: number }[];
}

export type ScanPeriod = "month" | "total";

export interface ScanAllowance {
  used: number;
  limit: number;
  period: ScanPeriod;
}

export interface PlanSummary {
  plan: "free" | "premium";
  premiumUntil: string | null;
  testActivationAvailable: boolean;
  receiptScans: ScanAllowance;
  recipeScans: ScanAllowance;
  householdMemberLimit: number;
  spendingMonths: number | null;
}
