import { apiRequest } from "./apiClient";
import type { Recipe, RecipeAvailability, RecipeRequest, RecipeSummary } from "./types";

export function listRecipes(householdId: number, search: string): Promise<RecipeSummary[]> {
  return apiRequest<RecipeSummary[]>(`/households/${householdId}/recipes?${new URLSearchParams({ search })}`);
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

export function getRecipeAvailability(recipeId: number, servings: number): Promise<RecipeAvailability> {
  return apiRequest<RecipeAvailability>(`/recipes/${recipeId}/availability?servings=${servings}`);
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
