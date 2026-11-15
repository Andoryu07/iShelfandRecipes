import { describe, expect, it } from "vitest";
import type { Food, StockItem } from "../api/types";
import { groupStockItems, recentFoods } from "./stockGroups";

const milk: Food = { id: 1, name: "Mléko", genericName: "Mléko", category: "dairy", baseUnit: "milliliter" };
const rice: Food = { id: 2, name: "Rýže", genericName: "Rýže", category: "dryGoods", baseUnit: "gram" };
const cheese: Food = { id: 3, name: "Eidam", genericName: "Sýr", category: "dairy", baseUnit: "gram" };

function item(
  id: number,
  food: Food,
  quantity: number,
  expirationDate: string | null,
  createdAt = "2026-11-01T10:00:00Z",
): StockItem {
  return {
    id,
    food,
    storageLocationId: food === rice ? 3 : 1,
    quantity,
    reservedQuantity: id === 2 ? 200 : 0,
    availableQuantity: quantity,
    expirationDate,
    createdAt,
    reservations: [],
  };
}

describe("stock groups", () => {
  const today = new Date(2026, 10, 15);

  it("groups the same food, sums quantities and splits urgent groups", () => {
    const groups = groupStockItems(
      [
        item(1, milk, 1000, "2026-11-20"),
        item(2, milk, 1000, "2026-11-15"),
        item(3, rice, 1000, null),
        item(4, cheese, 600, "2026-12-01"),
        item(5, milk, 500, "2026-11-14"),
      ],
      today,
      3,
    );

    expect(groups.soon.map((group) => group.food.name)).toEqual(["Mléko"]);
    const milkGroup = groups.soon[0];
    expect(milkGroup.items.map((stockItem) => stockItem.id)).toEqual([5, 2, 1]);
    expect([
      milkGroup.totalQuantity,
      milkGroup.reservedQuantity,
      milkGroup.nearestExpirationDate,
      milkGroup.status,
    ]).toEqual([2500, 200, "2026-11-14", "expired"]);
    expect(groups.other.map((group) => group.food.name)).toEqual(["Eidam", "Rýže"]);
  });

  it("lists recently added foods once each", () => {
    const foods = recentFoods([
      item(1, milk, 1, null, "2026-11-01T10:00:00Z"),
      item(2, rice, 1, null, "2026-11-03T10:00:00Z"),
      item(3, milk, 1, null, "2026-11-04T10:00:00Z"),
      item(4, cheese, 1, null, "2026-11-02T10:00:00Z"),
    ]);

    expect(foods.map((food) => food.name)).toEqual(["Mléko", "Rýže", "Eidam"]);
  });
});
