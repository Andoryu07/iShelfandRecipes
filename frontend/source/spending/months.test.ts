import { describe, expect, it } from "vitest";
import { changePercent, formatMonthLong, monthLocative, monthText, shiftMonthText } from "./months";

describe("months", () => {
  it("moves between months across years", () => {
    expect(monthText(new Date(2026, 10, 15))).toBe("2026-11");
    expect(shiftMonthText("2026-11", 2)).toBe("2027-01");
    expect(shiftMonthText("2026-01", -1)).toBe("2025-12");
  });

  it("formats Czech month names", () => {
    expect(formatMonthLong("2026-11")).toBe("Listopad 2026");
    expect(monthLocative("2026-11")).toBe("listopadu");
    expect(monthLocative("2026-07")).toBe("červenci");
  });

  it("computes the change against the previous month", () => {
    expect(changePercent(880, 1000)).toBe(-12);
    expect(changePercent(1200, 1000)).toBe(20);
    expect(changePercent(500, 0)).toBeNull();
  });
});
