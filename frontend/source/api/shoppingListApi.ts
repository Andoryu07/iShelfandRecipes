import { apiRequest } from "./apiClient";
import type { ShoppingListItem } from "./types";

export function listShoppingList(householdId: number): Promise<ShoppingListItem[]> {
  return apiRequest<ShoppingListItem[]>(`/households/${householdId}/shopping-list`);
}

export function addShoppingListItem(
  householdId: number,
  item: {
    foodId?: number;
    name?: string;
    quantity?: number | null;
    note?: string | null;
    isPersonal: boolean;
  },
): Promise<ShoppingListItem> {
  return apiRequest<ShoppingListItem>(`/households/${householdId}/shopping-list`, {
    method: "POST",
    body: item,
  });
}

export function addRecipeToShoppingList(
  recipeId: number,
  servings: number,
): Promise<{ addedCount: number; items: ShoppingListItem[] }> {
  return apiRequest(`/recipes/${recipeId}/shopping-list`, {
    method: "POST",
    body: { servings, isPersonal: false },
  });
}

export function updateShoppingListItem(
  itemId: number,
  changes: { quantity?: number | null; note?: string | null; isChecked?: boolean; isPersonal?: boolean },
): Promise<ShoppingListItem> {
  return apiRequest<ShoppingListItem>(`/shopping-list-items/${itemId}`, { method: "PATCH", body: changes });
}

export function deleteShoppingListItem(itemId: number): Promise<void> {
  return apiRequest<void>(`/shopping-list-items/${itemId}`, { method: "DELETE" });
}

export function deleteCheckedShoppingListItems(householdId: number): Promise<void> {
  return apiRequest<void>(`/households/${householdId}/shopping-list/checked`, { method: "DELETE" });
}
