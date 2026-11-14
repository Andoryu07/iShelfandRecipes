import { describe, expect, it } from "vitest";
import { suggestFood } from "./foodSuggestions";

describe("food suggestions", () => {
  it("suggests category, unit and kind from Czech names", () => {
    expect(suggestFood("Mléko polotučné")).toEqual({
      category: "dairy",
      baseUnit: "milliliter",
      genericName: "Mléko",
    });
    expect(suggestFood("mleko")?.baseUnit).toBe("milliliter");
    expect(suggestFood("Rohlík tukový")).toMatchObject({ category: "bakery", baseUnit: "piece" });
    expect(suggestFood("Kuřecí prsa")).toMatchObject({ category: "meatAndSausages", baseUnit: "gram" });
    expect(suggestFood("Eidam 30 %")).toMatchObject({ category: "dairy", genericName: "Sýr" });
    expect(suggestFood("Paprika sladká mletá")).toMatchObject({ category: "spices" });
    expect(suggestFood("Olej slunečnicový")).toMatchObject({ baseUnit: "milliliter" });
    expect(suggestFood("Mleté maso vepřové")).toMatchObject({ category: "meatAndSausages" });
  });

  it("returns nothing for unknown names", () => {
    expect(suggestFood("Toaletní papír")).toBeNull();
    expect(suggestFood("  ")).toBeNull();
  });
});
