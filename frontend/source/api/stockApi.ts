import { apiRequest } from "./apiClient";
import type {
  Food,
  FoodCategory,
  MeasurementUnit,
  NutriscoreGrade,
  Nutrition,
  Reservation,
  StockItem,
  StockMovement,
} from "./types";

export function searchFoods(householdId: number, search: string): Promise<Food[]> {
  return apiRequest<Food[]>(`/households/${householdId}/foods?${new URLSearchParams({ search })}`);
}

export function getLastAddedQuantity(foodId: number): Promise<{ quantity: number | null }> {
  return apiRequest<{ quantity: number | null }>(`/foods/${foodId}/last-added-quantity`);
}

export function createFood(
  householdId: number,
  food: {
    name: string;
    genericName: string | null;
    category: FoodCategory;
    baseUnit: MeasurementUnit;
    barcode?: string | null;
    nutrition?: Nutrition | null;
    nutriscoreGrade?: NutriscoreGrade | null;
  },
): Promise<Food> {
  return apiRequest<Food>(`/households/${householdId}/foods`, { method: "POST", body: food });
}

export interface StockItemFilters {
  storageLocationId?: number;
  search?: string;
  expiringWithinDays?: number;
}

export function listStockItems(householdId: number, filters: StockItemFilters): Promise<StockItem[]> {
  const parameters = new URLSearchParams();
  if (filters.storageLocationId !== undefined) {
    parameters.set("storageLocationId", String(filters.storageLocationId));
  }
  if (filters.search) {
    parameters.set("search", filters.search);
  }
  if (filters.expiringWithinDays !== undefined) {
    parameters.set("expiringWithinDays", String(filters.expiringWithinDays));
  }
  return apiRequest<StockItem[]>(`/households/${householdId}/stock-items?${parameters}`);
}

export function createStockItem(
  householdId: number,
  stockItem: { foodId: number; storageLocationId: number; quantity: number; expirationDate: string | null },
): Promise<StockItem> {
  return apiRequest<StockItem>(`/households/${householdId}/stock-items`, { method: "POST", body: stockItem });
}

export function updateStockItem(
  stockItemId: number,
  changes: { storageLocationId?: number; expirationDate?: string | null },
): Promise<StockItem> {
  return apiRequest<StockItem>(`/stock-items/${stockItemId}`, { method: "PATCH", body: changes });
}

export function listStockMovements(stockItemId: number): Promise<StockMovement[]> {
  return apiRequest<StockMovement[]>(`/stock-items/${stockItemId}/movements`);
}

export function writeOffStock(
  stockItemId: number,
  reason: "eaten" | "spoiled" | "destroyed",
  quantity: number,
): Promise<StockItem> {
  return apiRequest<StockItem>(`/stock-items/${stockItemId}/movements`, {
    method: "POST",
    body: { reason, quantity },
  });
}

export function correctStockQuantity(stockItemId: number, newQuantity: number): Promise<StockItem> {
  return apiRequest<StockItem>(`/stock-items/${stockItemId}/movements`, {
    method: "POST",
    body: { reason: "correction", newQuantity },
  });
}

export function createReservation(
  householdId: number,
  reservation: { stockItemId: number; quantity: number; note: string | null },
): Promise<Reservation> {
  return apiRequest<Reservation>(`/households/${householdId}/reservations`, {
    method: "POST",
    body: reservation,
  });
}

export function listActiveReservations(householdId: number): Promise<Reservation[]> {
  return apiRequest<Reservation[]>(`/households/${householdId}/reservations?status=active`);
}

export function cancelReservation(reservationId: number): Promise<Reservation> {
  return apiRequest<Reservation>(`/reservations/${reservationId}/cancel`, { method: "POST" });
}

export function updateFood(
  foodId: number,
  changes: {
    name?: string;
    genericName?: string | null;
    category?: FoodCategory;
    icon?: string | null;
    barcode?: string | null;
    nutrition?: Nutrition | null;
    nutriscoreGrade?: NutriscoreGrade | null;
    pieceWeightGrams?: number | null;
  },
): Promise<Food> {
  return apiRequest<Food>(`/foods/${foodId}`, { method: "PATCH", body: changes });
}

export function uploadFoodPhoto(foodId: number, photo: Blob): Promise<Food> {
  const body = new FormData();
  body.append("file", photo, photo.type === "image/webp" ? "photo.webp" : "photo.jpg");
  return apiRequest<Food>(`/foods/${foodId}/photo`, { method: "PUT", body });
}

export function deleteFoodPhoto(foodId: number): Promise<Food> {
  return apiRequest<Food>(`/foods/${foodId}/photo`, { method: "DELETE" });
}
