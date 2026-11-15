import { describe, expect, it } from "vitest";
import type { Food, Recipe } from "../api/types";
import {
  buildRecipeRequest,
  emptyIngredientRow,
  formValuesFromRecipe,
  formValuesFromScan,
} from "./recipeForm";

const flour: Food = {
  id: 3,
  name: "Mouka hladká",
  genericName: "Mouka",
  category: "dryGoods",
  baseUnit: "gram",
};

describe("recipe form", () => {
  it("round-trips an existing recipe with readable units", () => {
    const recipe: Recipe = {
      id: 1,
      name: "Palačinky",
      servings: 4,
      preparationMinutes: 30,
      isPredefined: false,
      icon: "🥞",
      missingCount: 0,
      createdAt: "2026-11-12T10:00:00Z",
      instructions: "Usmaž.",
      ingredients: [{ id: 9, food: flour, quantity: 1500, acceptsAnyOfKind: false, isOptional: false }],
    };

    const values = formValuesFromRecipe(recipe);

    expect([values.ingredients[0].quantityText, values.ingredients[0].unitSymbol]).toEqual(["1,5", "kg"]);
    expect(buildRecipeRequest(values)).toEqual({
      error: null,
      request: {
        name: "Palačinky",
        servings: 4,
        preparationMinutes: 30,
        instructions: "Usmaž.",
        icon: "🥞",
        dishType: null,
        isVegetarian: false,
        ingredients: [
          { foodId: 3, newFood: null, quantity: 1500, acceptsAnyOfKind: false, isOptional: false },
        ],
      },
    });
  });

  it("skips empty rows, sends new foods and rejects incomplete or duplicate ones", () => {
    const values = formValuesFromRecipe(null);
    values.name = "Lívance";
    values.ingredients = [
      {
        ...emptyIngredientRow(),
        food: { newFoodName: "Mléko", baseUnit: "milliliter", category: "dairy", genericName: "Mléko" },
        quantityText: "0,5",
        unitSymbol: "l",
      },
      emptyIngredientRow(),
    ];

    const request = buildRecipeRequest(values).request!;
    expect(request.ingredients).toEqual([
      {
        foodId: null,
        newFood: { name: "Mléko", genericName: "Mléko", category: "dairy", baseUnit: "milliliter" },
        quantity: 500,
        acceptsAnyOfKind: true,
        isOptional: false,
      },
    ]);
    expect(request.preparationMinutes).toBeNull();

    values.ingredients.push({ ...emptyIngredientRow(), food: flour, quantityText: "" });
    expect(buildRecipeRequest(values).error).toBe("U každé suroviny vyber potravinu a zadej množství.");

    values.ingredients = [
      { ...emptyIngredientRow(), food: flour, quantityText: "100" },
      { ...emptyIngredientRow(), food: flour, quantityText: "200" },
    ];
    expect(buildRecipeRequest(values).error).toBe("Každá potravina může být v receptu jen jednou.");

    values.servingsText = "0";
    expect(buildRecipeRequest(values).request).toBeNull();
  });
});

describe("recipe from a photo", () => {
  it("uses known foods, proposes new ones and leaves unknown amounts empty", () => {
    const values = formValuesFromScan({
      name: "Bramboráky",
      servings: 4,
      preparationMinutes: 45,
      dishType: "mainCourse",
      isVegetarian: true,
      instructions: "1. Nastrouhej.",
      usedScans: 1,
      scanLimit: 3,
      ingredients: [
        {
          originalText: "1,5 kg mouky",
          name: "Mouka hladká",
          genericName: "Mouka",
          category: "dryGoods",
          quantity: 1500,
          unit: "gram",
          isOptional: false,
          suggestedFood: flour,
        },
        {
          originalText: "2 vejce",
          name: "Vejce",
          genericName: "Vejce",
          category: "dairy",
          quantity: 2,
          unit: "piece",
          isOptional: false,
          suggestedFood: null,
        },
        {
          originalText: "sůl",
          name: "Sůl",
          genericName: "Sůl",
          category: "spices",
          quantity: null,
          unit: null,
          isOptional: true,
          suggestedFood: null,
        },
      ],
    });

    expect([values.name, values.servingsText, values.preparationMinutesText, values.dishType]).toEqual([
      "Bramboráky",
      "4",
      "45",
      "mainCourse",
    ]);
    expect(values.ingredients.map((row) => [row.quantityText, row.unitSymbol, row.isOptional])).toEqual([
      ["1,5", "kg", false],
      ["2", "ks", false],
      ["", "g", true],
    ]);
    expect(values.ingredients[0].food).toBe(flour);
    expect(values.ingredients[1].food).toEqual({
      newFoodName: "Vejce",
      baseUnit: "piece",
      category: "dairy",
      genericName: "Vejce",
    });
  });
});
