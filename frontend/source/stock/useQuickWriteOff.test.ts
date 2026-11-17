import { describe, expect, it } from "vitest";
import type { StockItem } from "../api/types";
import { edibleQuantity } from "./useQuickWriteOff";

function item(quantity: number, reservations: { userId: number; quantity: number }[]): StockItem {
  return { id: 1, quantity, reservations } as unknown as StockItem;
}

describe("edibleQuantity", () => {
  it("leaves out only what other members reserved", () => {
    expect(edibleQuantity(item(500, []), 1)).toBe(500);
    expect(
      edibleQuantity(
        item(500, [
          { userId: 2, quantity: 200 },
          { userId: 1, quantity: 100 },
        ]),
        1,
      ),
    ).toBe(300);
    expect(edibleQuantity(item(500, [{ userId: 2, quantity: 600 }]), 1)).toBe(0);
  });
});
