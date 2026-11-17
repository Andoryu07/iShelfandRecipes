import { describe, expect, it } from "vitest";
import type { Food, IngredientAvailability } from "../api/types";
import { recipeNutrition } from "./nutrition";

function ingredient(
  food: Partial<Food>,
  requiredQuantity: number,
  isOptional = false,
  isForFrying = false,
): IngredientAvailability {
  return {
    food: { id: 1, name: "x", genericName: null, category: "other", baseUnit: "gram", ...food },
    requiredQuantity,
    isOptional,
    isForFrying,
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

  it("counts only a tenth of frying fat", () => {
    const result = recipeNutrition(
      [
        ingredient({ baseUnit: "milliliter", nutrition: { energyKcal: 828, fat: 92 } }, 500, false, true),
        ingredient({ nutrition: { energyKcal: 350, fat: 26 } }, 100),
      ],
      1,
    );

    expect(result.perServing.energyKcal).toBe(764);
    expect(result.perServing.fat).toBe(72);
    expect(result.hasFryingFat).toBe(true);
  });
});
