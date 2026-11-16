import { apiRequest } from "./apiClient";
import type {
  ScanPeriod,
  HouseholdCooking,
  Recipe,
  RecipeAvailability,
  RecipeCooking,
  RecipeRequest,
  RecipeSummary,
  ScannedRecipe,
} from "./types";

export function listRecipes(
  householdId: number,
  search: string,
  foodIds: number[] = [],
): Promise<RecipeSummary[]> {
  const parameters = new URLSearchParams({ search });
  foodIds.forEach((foodId) => parameters.append("containsFoodIds", String(foodId)));
  return apiRequest<RecipeSummary[]>(`/households/${householdId}/recipes?${parameters}`);
}

export function getRecipeScanAllowance(
  householdId: number,
): Promise<{ usedScans: number; scanLimit: number; scanPeriod: ScanPeriod }> {
  return apiRequest(`/households/${householdId}/recipes/scan-allowance`);
}

export function scanRecipe(
  householdId: number,
  photos: { content: Blob; fileName: string }[],
): Promise<ScannedRecipe> {
  const formData = new FormData();
  photos.forEach((photo) => formData.append("files", photo.content, photo.fileName));
  return apiRequest<ScannedRecipe>(`/households/${householdId}/recipes/scan`, {
    method: "POST",
    body: formData,
  });
}

export function getRecipe(recipeId: number): Promise<Recipe> {
  return apiRequest<Recipe>(`/recipes/${recipeId}`);
}

export function createRecipe(householdId: number, recipe: RecipeRequest): Promise<Recipe> {
  return apiRequest<Recipe>(`/households/${householdId}/recipes`, { method: "POST", body: recipe });
}

export function updateRecipe(recipeId: number, recipe: RecipeRequest): Promise<Recipe> {
  return apiRequest<Recipe>(`/recipes/${recipeId}`, { method: "PATCH", body: recipe });
}

export function deleteRecipe(recipeId: number): Promise<void> {
  return apiRequest<void>(`/recipes/${recipeId}`, { method: "DELETE" });
}

export function getRecipeAvailability(
  recipeId: number,
  servings: number | null,
): Promise<RecipeAvailability> {
  const query = servings === null ? "" : `?servings=${servings}`;
  return apiRequest<RecipeAvailability>(`/recipes/${recipeId}/availability${query}`);
}

export function addFavouriteRecipe(recipeId: number): Promise<void> {
  return apiRequest<void>(`/recipes/${recipeId}/favourite`, { method: "PUT" });
}

export function removeFavouriteRecipe(recipeId: number): Promise<void> {
  return apiRequest<void>(`/recipes/${recipeId}/favourite`, { method: "DELETE" });
}

export function listRecipeCookings(recipeId: number): Promise<RecipeCooking[]> {
  return apiRequest<RecipeCooking[]>(`/recipes/${recipeId}/cookings`);
}

export function listHouseholdCookings(householdId: number): Promise<HouseholdCooking[]> {
  return apiRequest<HouseholdCooking[]>(`/households/${householdId}/cookings`);
}

export function cookRecipe(recipeId: number, servings: number): Promise<unknown> {
  return apiRequest<unknown>(`/recipes/${recipeId}/cook`, { method: "POST", body: { servings } });
}

export function reserveRecipeIngredients(recipeId: number, servings: number): Promise<RecipeAvailability> {
  return apiRequest<RecipeAvailability>(`/recipes/${recipeId}/reserve`, {
    method: "POST",
    body: { servings },
  });
}
