import { describe, expect, it } from "vitest";
import type { FoodCategory, IngredientAvailability, MeasurementUnit, StorageLocation } from "../api/types";
import { buildFoodRows, defaultStorageLocationId, missingIngredientsToAdd } from "./missingFoods";

const storageLocations: StorageLocation[] = [
  { id: 1, householdId: 1, name: "fridge", kind: "fridge" },
  { id: 2, householdId: 1, name: "freezer", kind: "freezer" },
  { id: 3, householdId: 1, name: "pantry", kind: "pantry" },
];

function ingredient(
  ingredientId: number,
  category: FoodCategory,
  baseUnit: MeasurementUnit,
  missingQuantity: number,
  isOptional = false,
): IngredientAvailability {
  return {
    ingredientId,
    food: { id: ingredientId, name: `Food ${ingredientId}`, genericName: null, category, baseUnit },
    acceptsAnyOfKind: false,
    isOptional,
    requiredQuantity: missingQuantity + 100,
    availableQuantity: 100,
    missingQuantity,
    reservedForRecipe: 0,
    reservedByOthers: 0,
    unitPrice: null,
    estimatedPrice: null,
  };
}

describe("missing foods", () => {
  it("keeps only required missing ingredients with readable quantities", () => {
    const rows = buildFoodRows(
      missingIngredientsToAdd([
        ingredient(1, "dairy", "milliliter", 1500),
        ingredient(2, "dryGoods", "gram", 250),
        ingredient(3, "vegetables", "piece", 1.5),
        ingredient(4, "spices", "gram", 5, true),
        ingredient(5, "fruit", "gram", 0),
      ]),
      storageLocations,
    );
    expect(rows.map((row) => [row.key, row.quantityText, row.unitSymbol, row.storageLocationId])).toEqual([
      [1, "1,5", "l", 1],
      [2, "250", "g", 3],
      [3, "2", "ks", 1],
    ]);
    expect(rows.every((row) => row.isSelected && row.expirationDate === "")).toBe(true);
  });

  it("picks the storage location by category and falls back to the first one", () => {
    expect(defaultStorageLocationId("frozen", storageLocations)).toBe(2);
    expect(defaultStorageLocationId("frozen", [storageLocations[2]])).toBe(3);
    expect(defaultStorageLocationId("other", [])).toBe(0);
  });
});

describe("foods without a quantity", () => {
  it("start empty with the smallest unit", () => {
    const food = {
      id: 9,
      name: "Mouka",
      genericName: null,
      category: "dryGoods" as const,
      baseUnit: "gram" as const,
    };
    expect(buildFoodRows([{ key: 1, food, quantity: null }], storageLocations)[0]).toMatchObject({
      quantityText: "",
      unitSymbol: "g",
      storageLocationId: 3,
    });
  });
});
