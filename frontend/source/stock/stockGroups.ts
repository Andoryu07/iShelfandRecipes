import type { Food, StockItem } from "../api/types";
import { expirationStatus, type ExpirationStatus } from "./expiration";

export interface StockGroup {
  food: Food;
  items: StockItem[];
  totalQuantity: number;
  reservedQuantity: number;
  nearestExpirationDate: string | null;
  status: ExpirationStatus;
  storageLocationIds: number[];
}

function compareExpiration(first: string | null, second: string | null): number {
  if (first === second) {
    return 0;
  }
  if (first === null) {
    return 1;
  }
  if (second === null) {
    return -1;
  }
  return first < second ? -1 : 1;
}

export function groupStockItems(
  items: StockItem[],
  today: Date,
  warningDays: number,
): { soon: StockGroup[]; other: StockGroup[] } {
  const byFood = new Map<number, StockItem[]>();
  for (const item of items) {
    byFood.set(item.food.id, [...(byFood.get(item.food.id) ?? []), item]);
  }
  const groups: StockGroup[] = [...byFood.values()].map((groupItems) => {
    const sorted = [...groupItems].sort((first, second) =>
      compareExpiration(first.expirationDate, second.expirationDate),
    );
    const nearestExpirationDate = sorted[0].expirationDate;
    return {
      food: sorted[0].food,
      items: sorted,
      totalQuantity: sorted.reduce((sum, item) => sum + item.quantity, 0),
      reservedQuantity: sorted.reduce((sum, item) => sum + item.reservedQuantity, 0),
      nearestExpirationDate,
      status: expirationStatus(nearestExpirationDate, today, warningDays),
      storageLocationIds: [...new Set(sorted.map((item) => item.storageLocationId))],
    };
  });
  groups.sort(
    (first, second) =>
      compareExpiration(first.nearestExpirationDate, second.nearestExpirationDate) ||
      first.food.name.localeCompare(second.food.name, "cs"),
  );
  return {
    soon: groups.filter((group) => group.status === "expired" || group.status === "soon"),
    other: groups.filter((group) => group.status === "fresh" || group.status === "none"),
  };
}

export function recentFoods(items: StockItem[], limit = 6): Food[] {
  const sorted = [...items].sort((first, second) => (first.createdAt < second.createdAt ? 1 : -1));
  const foods: Food[] = [];
  for (const item of sorted) {
    if (!foods.some((food) => food.id === item.food.id)) {
      foods.push(item.food);
    }
    if (foods.length === limit) {
      break;
    }
  }
  return foods;
}
