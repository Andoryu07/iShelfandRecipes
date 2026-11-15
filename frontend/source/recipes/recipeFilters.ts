import type { DishType, Food, RecipeSummary } from "../api/types";

export type QuickFilter = "favourites" | "expiring" | "quick" | "own" | "vegetarian";
export type RecipeSort = "name" | "missing" | "time" | "price";

export interface RecipeFilterState {
  quickFilters: QuickFilter[];
  maxMissing: number | null;
  dishTypes: DishType[];
  foods: Food[];
  sort: RecipeSort;
}

export const emptyRecipeFilters: RecipeFilterState = {
  quickFilters: [],
  maxMissing: null,
  dishTypes: [],
  foods: [],
  sort: "name",
};

export const maximumChosenFoods = 5;

const quickFilterMatches: Record<QuickFilter, (recipe: RecipeSummary) => boolean> = {
  favourites: (recipe) => recipe.isFavourite === true,
  expiring: (recipe) => (recipe.expiringIngredientCount ?? 0) > 0,
  quick: (recipe) => recipe.preparationMinutes !== null && recipe.preparationMinutes <= 30,
  own: (recipe) => !recipe.isPredefined,
  vegetarian: (recipe) => recipe.isVegetarian === true,
};

function compareNullableNumbers(first: number | null | undefined, second: number | null | undefined): number {
  if (first == null || second == null) {
    return first == null ? (second == null ? 0 : 1) : -1;
  }
  return first - second;
}

const comparators: Record<RecipeSort, (first: RecipeSummary, second: RecipeSummary) => number> = {
  name: () => 0,
  missing: (first, second) => first.missingCount - second.missingCount,
  time: (first, second) => compareNullableNumbers(first.preparationMinutes, second.preparationMinutes),
  price: (first, second) => compareNullableNumbers(first.estimatedPrice, second.estimatedPrice),
};

export function applyRecipeFilters(recipes: RecipeSummary[], state: RecipeFilterState): RecipeSummary[] {
  const filtered = recipes.filter(
    (recipe) =>
      state.quickFilters.every((filter) => quickFilterMatches[filter](recipe)) &&
      (state.maxMissing === null || recipe.missingCount <= state.maxMissing) &&
      (state.dishTypes.length === 0 ||
        (recipe.dishType != null && state.dishTypes.includes(recipe.dishType))),
  );
  const comparator = comparators[state.sort];
  return [...filtered].sort(
    (first, second) =>
      Number(second.isFavourite === true) - Number(first.isFavourite === true) || comparator(first, second),
  );
}

export function advancedFilterCount(state: RecipeFilterState): number {
  return (
    (state.maxMissing !== null && state.maxMissing > 0 ? 1 : 0) +
    state.dishTypes.length +
    state.foods.length +
    (state.sort === "name" ? 0 : 1)
  );
}
