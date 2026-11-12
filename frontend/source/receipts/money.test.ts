import { describe, expect, it } from "vitest";
import { scaledSize } from "./resizeImage";
import { moneyText, parseMoney, sumMoney } from "./money";

describe("money", () => {
  it("parses prices including discounts", () => {
    expect(parseMoney("24,90")).toBe(24.9);
    expect(parseMoney("-20")).toBe(-20);
    expect(parseMoney("99.9 Kč")).toBe(99.9);
    expect(parseMoney("1,234")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });

  it("adds amounts without floating point errors", () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
    expect(sumMoney([99.9, 17.5, 22.4, 29.9, 29.9, 24.7, -20])).toBe(204.3);
    expect(moneyText(204.3)).toBe("204,30");
  });

  it("shrinks large photos and keeps small ones", () => {
    expect(scaledSize(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(scaledSize(900, 1200)).toEqual({ width: 900, height: 1200 });
  });
});
