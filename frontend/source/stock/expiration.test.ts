import { describe, expect, it } from "vitest";
import { daysUntil, expirationStatus, localDateText } from "./expiration";

describe("expiration", () => {
  const today = new Date(2026, 10, 12, 23, 30);

  it("counts whole days in local time", () => {
    expect(localDateText(today)).toBe("2026-11-12");
    expect(daysUntil("2026-11-12", today)).toBe(0);
    expect(daysUntil("2026-11-15", today)).toBe(3);
    expect(daysUntil("2026-11-11", today)).toBe(-1);
  });

  it("classifies expiration dates", () => {
    expect(expirationStatus(null, today)).toBe("none");
    expect(expirationStatus("2026-11-11", today)).toBe("expired");
    expect(expirationStatus("2026-11-12", today)).toBe("soon");
    expect(expirationStatus("2026-11-15", today, 3)).toBe("soon");
    expect(expirationStatus("2026-11-16", today, 3)).toBe("fresh");
    expect(expirationStatus("2026-11-14", today)).toBe("soon");
    expect(expirationStatus("2026-11-15", today)).toBe("fresh");
    expect(expirationStatus("2026-11-12", today, 0)).toBe("soon");
    expect(expirationStatus("2026-11-13", today, 0)).toBe("fresh");
  });
});
