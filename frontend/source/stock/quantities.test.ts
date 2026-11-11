import { describe, expect, it } from "vitest";
import { displayUnits, formatQuantity, parseDecimal, toBaseQuantity } from "./quantities";

describe("quantities", () => {
  it("parses Czech and English decimal input", () => {
    expect(parseDecimal("1,5")).toBe(1.5);
    expect(parseDecimal(" 2.25 ")).toBe(2.25);
    expect(parseDecimal("1 000")).toBe(1000);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("-1")).toBeNull();
  });

  it("converts display units to base units", () => {
    expect(toBaseQuantity(1.5, displayUnits.gram[1])).toBe(1500);
    expect(toBaseQuantity(0.33, displayUnits.milliliter[1])).toBe(330);
    expect(toBaseQuantity(250, displayUnits.gram[0])).toBe(250);
  });

  it("formats base quantities in the most readable unit", () => {
    expect(formatQuantity(1500, "gram")).toBe("1,5 kg");
    expect(formatQuantity(250, "gram")).toBe("250 g");
    expect(formatQuantity(1000, "milliliter")).toBe("1 l");
    expect(formatQuantity(330, "milliliter")).toBe("330 ml");
    expect(formatQuantity(3, "piece")).toBe("3 ks");
    expect(formatQuantity(0.5, "piece")).toBe("0,5 ks");
  });
});
