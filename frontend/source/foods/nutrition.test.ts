import { describe, expect, it } from "vitest";
import type { Food, IngredientAvailability } from "../api/types";
import { recipeNutrition } from "./nutrition";

function ingredient(
  food: Partial<Food>,
  requiredQuantity: number,
  isOptional = false,
): IngredientAvailability {
  return {
    food: { id: 1, name: "x", genericName: null, category: "other", baseUnit: "gram", ...food },
    requiredQuantity,
    isOptional,
  } as IngredientAvailability;
}

describe("recipeNutrition", () => {
  it("adds known ingredients per serving, converts pieces by their weight and skips optional ones", () => {
    const result = recipeNutrition(
      [
        ingredient({ nutrition: { energyKcal: 350, proteins: 10 } }, 200),
        ingredient(
          { baseUnit: "piece", pieceWeightGrams: 50, nutrition: { energyKcal: 150, proteins: 12 } },
          2,
        ),
        ingredient({ baseUnit: "piece", nutrition: { energyKcal: 100 } }, 1),
        ingredient({}, 100),
        ingredient({ nutrition: { energyKcal: 900 } }, 50, true),
      ],
      2,
    );

    expect(result.knownCount).toBe(2);
    expect(result.ingredientCount).toBe(4);
    expect(result.perServing.energyKcal).toBe(425);
    expect(result.perServing.proteins).toBe(16);
  });
});
