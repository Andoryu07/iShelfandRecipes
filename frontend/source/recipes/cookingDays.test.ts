import { describe, expect, it } from "vitest";
import { groupByDay } from "./cookingDays";

function at(year: number, month: number, day: number, hour: number) {
  return { createdAt: new Date(year, month - 1, day, hour).toISOString() };
}

describe("cooking days", () => {
  it("groups newest first into today, yesterday and dates", () => {
    const items = [at(2026, 11, 15, 12), at(2026, 11, 15, 8), at(2026, 11, 14, 19), at(2026, 11, 2, 18)];

    const groups = groupByDay(items, new Date(2026, 10, 15, 20));

    expect(groups.map((group) => [group.label, group.items.length])).toEqual([
      ["Dnes", 2],
      ["Včera", 1],
      ["2. 11. 2026", 1],
    ]);
  });
});
