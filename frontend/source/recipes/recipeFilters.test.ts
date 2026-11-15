import { describe, expect, it } from "vitest";
import type { RecipeSummary } from "../api/types";
import { advancedFilterCount, applyRecipeFilters, emptyRecipeFilters } from "./recipeFilters";

function recipe(name: string, fields: Partial<RecipeSummary> = {}): RecipeSummary {
  return {
    id: name.length,
    name,
    servings: 4,
    preparationMinutes: 60,
    isPredefined: true,
    missingCount: 0,
    createdAt: "2026-11-15T10:00:00Z",
    ...fields,
  };
}

const recipes = [
  recipe("Bábovka", {
    dishType: "dessert",
    isVegetarian: true,
    missingCount: 2,
    preparationMinutes: 70,
    estimatedPrice: 90,
  }),
  recipe("Guláš", {
    dishType: "mainCourse",
    missingCount: 4,
    preparationMinutes: 150,
    expiringIngredientCount: 1,
  }),
  recipe("Polévka", {
    dishType: "soup",
    isVegetarian: true,
    missingCount: 1,
    preparationMinutes: 25,
    estimatedPrice: 40,
  }),
  recipe("Žemlovka", {
    dishType: "dessert",
    isFavourite: true,
    missingCount: 3,
    preparationMinutes: null,
    isPredefined: false,
  }),
];

function names(state: Partial<typeof emptyRecipeFilters>): string[] {
  return applyRecipeFilters(recipes, { ...emptyRecipeFilters, ...state }).map((item) => item.name);
}

describe("recipe filters", () => {
  it("keeps favourites first and filters by quick chips, missing count and dish type", () => {
    expect(names({})).toEqual(["Žemlovka", "Bábovka", "Guláš", "Polévka"]);
    expect(names({ quickFilters: ["vegetarian"] })).toEqual(["Bábovka", "Polévka"]);
    expect(names({ quickFilters: ["expiring"] })).toEqual(["Guláš"]);
    expect(names({ quickFilters: ["quick", "vegetarian"] })).toEqual(["Polévka"]);
    expect(names({ maxMissing: 0 })).toEqual([]);
    expect(names({ maxMissing: 2 })).toEqual(["Bábovka", "Polévka"]);
    expect(names({ dishTypes: ["dessert", "soup"] })).toEqual(["Žemlovka", "Bábovka", "Polévka"]);
  });

  it("sorts by missing ingredients, time and price with unknown values last", () => {
    expect(names({ sort: "missing" })).toEqual(["Žemlovka", "Polévka", "Bábovka", "Guláš"]);
    expect(names({ sort: "time" })).toEqual(["Žemlovka", "Polévka", "Bábovka", "Guláš"]);
    expect(names({ sort: "price" })).toEqual(["Žemlovka", "Polévka", "Bábovka", "Guláš"]);
  });

  it("counts the filters hidden in the sheet", () => {
    expect(advancedFilterCount(emptyRecipeFilters)).toBe(0);
    expect(advancedFilterCount({ ...emptyRecipeFilters, maxMissing: 0 })).toBe(0);
    expect(
      advancedFilterCount({ ...emptyRecipeFilters, maxMissing: 2, dishTypes: ["soup"], sort: "price" }),
    ).toBe(3);
  });
});
