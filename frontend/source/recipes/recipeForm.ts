import type { Recipe, RecipeIngredientRequest, RecipeRequest } from "../api/types";
import { baseUnitOf, isNewFood, newFoodRequest, type FoodChoice } from "../stock/FoodPicker";
import { bestDisplayUnit, fromBaseQuantity, parseBaseQuantity } from "../stock/quantities";
import { texts } from "../translations/cs";

export interface IngredientRow {
  key: string;
  food: FoodChoice | null;
  quantityText: string;
  unitSymbol: string;
  acceptsAnyOfKind: boolean;
  isOptional: boolean;
}

export interface RecipeFormValues {
  name: string;
  servingsText: string;
  preparationMinutesText: string;
  instructions: string;
  ingredients: IngredientRow[];
}

let nextKey = 0;

export function emptyIngredientRow(): IngredientRow {
  return {
    key: `ingredient${nextKey++}`,
    food: null,
    quantityText: "",
    unitSymbol: "g",
    acceptsAnyOfKind: true,
    isOptional: false,
  };
}

export function formValuesFromRecipe(recipe: Recipe | null): RecipeFormValues {
  if (recipe === null) {
    return {
      name: "",
      servingsText: "4",
      preparationMinutesText: "",
      instructions: "",
      ingredients: [emptyIngredientRow()],
    };
  }
  return {
    name: recipe.name,
    servingsText: String(recipe.servings),
    preparationMinutesText: recipe.preparationMinutes ? String(recipe.preparationMinutes) : "",
    instructions: recipe.instructions,
    ingredients: recipe.ingredients.map((ingredient) => {
      const unit = bestDisplayUnit(ingredient.quantity, ingredient.food.baseUnit);
      return {
        key: `ingredient${nextKey++}`,
        food: ingredient.food,
        quantityText: String(fromBaseQuantity(ingredient.quantity, unit)).replace(".", ","),
        unitSymbol: unit.symbol,
        acceptsAnyOfKind: ingredient.acceptsAnyOfKind,
        isOptional: ingredient.isOptional,
      };
    }),
  };
}

export function buildRecipeRequest(values: RecipeFormValues): {
  request: RecipeRequest | null;
  error: string | null;
} {
  const servings = Number(values.servingsText);
  const preparationMinutes = values.preparationMinutesText.trim()
    ? Number(values.preparationMinutesText)
    : null;
  if (!values.name.trim() || !Number.isInteger(servings) || servings < 1 || servings > 100) {
    return { request: null, error: texts.authentication.invalidInput };
  }
  if (preparationMinutes !== null && (!Number.isInteger(preparationMinutes) || preparationMinutes < 1)) {
    return { request: null, error: texts.authentication.invalidInput };
  }
  const ingredients: RecipeIngredientRequest[] = [];
  const foodKeys = new Set<string>();
  for (const row of values.ingredients) {
    if (row.food === null && !row.quantityText.trim()) {
      continue;
    }
    const baseUnit = baseUnitOf(row.food);
    const quantity = baseUnit ? parseBaseQuantity(row.quantityText, baseUnit, row.unitSymbol) : null;
    if (row.food === null || quantity === null) {
      return { request: null, error: texts.recipes.needsFoodAndQuantity };
    }
    const foodKey = isNewFood(row.food) ? `new:${row.food.newFoodName.toLowerCase()}` : `food:${row.food.id}`;
    if (foodKeys.has(foodKey)) {
      return { request: null, error: texts.recipes.duplicateFood };
    }
    foodKeys.add(foodKey);
    ingredients.push({
      foodId: isNewFood(row.food) ? null : row.food.id,
      newFood: isNewFood(row.food) ? newFoodRequest(row.food) : null,
      quantity,
      acceptsAnyOfKind: row.acceptsAnyOfKind,
      isOptional: row.isOptional,
    });
  }
  return {
    request: {
      name: values.name.trim(),
      servings,
      preparationMinutes,
      instructions: values.instructions,
      ingredients,
    },
    error: null,
  };
}
