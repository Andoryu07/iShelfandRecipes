import { apiRequest } from "./apiClient";
import type { Food, FoodCategory, MeasurementUnit, StockItem, StockMovement } from "./types";

export function searchFoods(householdId: number, search: string): Promise<Food[]> {
  return apiRequest<Food[]>(`/households/${householdId}/foods?${new URLSearchParams({ search })}`);
}

export function createFood(
  householdId: number,
  food: { name: string; genericName: string | null; category: FoodCategory; baseUnit: MeasurementUnit },
): Promise<Food> {
  return apiRequest<Food>(`/households/${householdId}/foods`, { method: "POST", body: food });
}

export interface StockItemFilters {
  storageLocationId?: number;
  search?: string;
}

export function listStockItems(householdId: number, filters: StockItemFilters): Promise<StockItem[]> {
  const parameters = new URLSearchParams();
  if (filters.storageLocationId !== undefined) {
    parameters.set("storageLocationId", String(filters.storageLocationId));
  }
  if (filters.search) {
    parameters.set("search", filters.search);
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
