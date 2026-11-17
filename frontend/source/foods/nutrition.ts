import type { Food, IngredientAvailability, Nutrition } from "../api/types";

export const nutritionKeys = [
  "energyKcal",
  "fat",
  "saturatedFat",
  "carbohydrates",
  "sugars",
  "proteins",
  "fiber",
  "salt",
] as const;

export type NutritionKey = (typeof nutritionKeys)[number];

export interface RecipeNutrition {
  perServing: Record<NutritionKey, number>;
  knownCount: number;
  ingredientCount: number;
}

export function hasNutrition(nutrition: Nutrition | null | undefined): nutrition is Nutrition {
  return Boolean(nutrition && nutritionKeys.some((key) => nutrition[key] != null));
}

export function gramsOf(food: Food, quantity: number): number | null {
  if (food.baseUnit === "piece") {
    return food.pieceWeightGrams ? quantity * food.pieceWeightGrams : null;
  }
  return quantity;
}

export function recipeNutrition(ingredients: IngredientAvailability[], servings: number): RecipeNutrition {
  const required = ingredients.filter((ingredient) => !ingredient.isOptional);
  const totals = Object.fromEntries(nutritionKeys.map((key) => [key, 0])) as Record<NutritionKey, number>;
  let knownCount = 0;
  for (const ingredient of required) {
    const grams = gramsOf(ingredient.food, ingredient.requiredQuantity);
    const nutrition = ingredient.food.nutrition;
    if (grams === null || !hasNutrition(nutrition) || nutrition.energyKcal == null) {
      continue;
    }
    knownCount += 1;
    for (const key of nutritionKeys) {
      totals[key] += ((nutrition[key] ?? 0) * grams) / 100;
    }
  }
  const divisor = Math.max(servings, 1);
  const perServing = Object.fromEntries(nutritionKeys.map((key) => [key, totals[key] / divisor])) as Record<
    NutritionKey,
    number
  >;
  return { perServing, knownCount, ingredientCount: required.length };
}

export function formatNutritionValue(key: NutritionKey, value: number): string {
  const rounded = key === "energyKcal" ? Math.round(value) : Math.round(value * 10) / 10;
  return `${String(rounded).replace(".", ",")} ${key === "energyKcal" ? "kcal" : "g"}`;
}
