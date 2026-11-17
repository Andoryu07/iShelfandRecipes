import { describe, expect, it } from "vitest";
import type { Food, ScannedReceiptItem } from "../api/types";
import {
  buildSaveItems,
  isUnconfirmedEstimate,
  createManualItem,
  createReviewItem,
  isCorrected,
} from "./reviewItems";

const milkFood: Food = {
  id: 7,
  name: "Mléko polotučné",
  genericName: "Mléko",
  category: "dairy",
  baseUnit: "milliliter",
};

function scanned(fields: Partial<ScannedReceiptItem> = {}): ScannedReceiptItem {
  return {
    originalText: "ALB SYR BALKAN.180 G",
    name: "Balkánský sýr",
    genericName: "Sýr",
    category: "dairy",
    isFood: true,
    quantity: 180,
    unit: "gram",
    price: 29.9,
    discount: 0,
    suggestedFood: null,
    ...fields,
  };
}

describe("review items", () => {
  it("prepares a new food with quantity and adds food to stock", () => {
    const item = createReviewItem(scanned(), 3);

    expect(item.food).toEqual({
      newFoodName: "Balkánský sýr",
      baseUnit: "gram",
      category: "dairy",
      genericName: "Sýr",
    });
    expect([item.quantityText, item.unitSymbol, item.priceText, item.addToStock]).toEqual([
      "180",
      "g",
      "29,90",
      true,
    ]);
    expect(isCorrected(item)).toBe(false);
    expect(buildSaveItems([item])).toEqual({
      errors: {},
      items: [
        {
          originalText: "ALB SYR BALKAN.180 G",
          name: "Balkánský sýr",
          category: "dairy",
          quantity: 180,
          unit: "gram",
          price: 29.9,
          discount: 0,
          correctedByUser: false,
          quantityIsEstimate: false,
          foodId: null,
          newFood: { name: "Balkánský sýr", genericName: "Sýr", category: "dairy", baseUnit: "gram" },
          addToStock: true,
          storageLocationId: 3,
          expirationDate: null,
        },
      ],
    });
  });

  it("uses a suggested food and shows large amounts in bigger units", () => {
    const item = createReviewItem(
      scanned({ name: "Mléko", quantity: 1500, unit: "milliliter", suggestedFood: milkFood }),
      3,
    );

    expect([item.quantityText, item.unitSymbol]).toEqual(["1,5", "l"]);
    const saved = buildSaveItems([item]).items[0];
    expect([saved.foodId, saved.newFood, saved.quantity, saved.unit]).toEqual([7, null, 1500, "milliliter"]);
  });

  it("drops a quantity in a unit that does not match the food", () => {
    const item = createReviewItem(scanned({ quantity: 2, unit: "piece", suggestedFood: milkFood }), 3);

    expect(item.quantityText).toBe("");
    expect(buildSaveItems([item]).errors[item.key]).toBe("Zadej množství.");
  });

  it("keeps discounts and non-food out of stock", () => {
    const discount = createReviewItem(
      scanned({
        originalText: "Sleva",
        name: "Sleva",
        isFood: false,
        quantity: null,
        unit: null,
        price: -20,
      }),
      3,
    );

    expect([discount.food, discount.addToStock, discount.priceText]).toEqual([null, false, "-20,00"]);
    const saved = buildSaveItems([discount]).items[0];
    expect([saved.price, saved.addToStock, saved.storageLocationId, saved.foodId, saved.newFood]).toEqual([
      -20,
      false,
      null,
      null,
      null,
    ]);
  });

  it("marks corrections and validates manual items", () => {
    const item = { ...createReviewItem(scanned(), 3), priceText: "31,90", expirationDate: "2026-12-01" };
    const manual = createManualItem(3);

    const result = buildSaveItems([item, manual]);

    expect(result.items[0].correctedByUser).toBe(true);
    expect(result.items[0].price).toBe(31.9);
    expect(result.items[0].expirationDate).toBe("2026-12-01");
    expect(result.errors[manual.key]).toBe("Zadej cenu, např. 24,90 nebo -20.");
    expect(result.items[1].originalText).toBe("Ruční položka");
  });

  it("gives a new food without a known unit grams unless its kind is counted in pieces", () => {
    const flour = createReviewItem(scanned({ name: "Mouka speciální", quantity: null, unit: null }), 3);
    const unknown = createReviewItem(scanned({ name: "Tajemná věc", quantity: null, unit: null }), 3);
    const eggs = createReviewItem(scanned({ name: "Vejce M", quantity: null, unit: null }), 3);

    expect(
      [flour.food, unknown.food, eggs.food].map((food) => food && "baseUnit" in food && food.baseUnit),
    ).toEqual(["gram", "gram", "piece"]);
  });

  it("treats an untouched estimate as an estimate until it is changed or confirmed", () => {
    const item = createReviewItem(
      scanned({ name: "Smetana", quantity: 200, unit: "milliliter", quantitySource: "estimate" }),
      3,
    );

    expect(isUnconfirmedEstimate(item)).toBe(true);
    expect(buildSaveItems([item]).items[0].quantityIsEstimate).toBe(true);
    expect(isUnconfirmedEstimate({ ...item, quantityConfirmed: true })).toBe(false);
    expect(isUnconfirmedEstimate({ ...item, quantityText: "250" })).toBe(false);
    const fromHistory = createReviewItem(
      scanned({ name: "Smetana", quantity: 200, unit: "milliliter", quantitySource: "history" }),
      3,
    );
    expect(isUnconfirmedEstimate(fromHistory)).toBe(false);
  });
});
