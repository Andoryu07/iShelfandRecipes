import { describe, expect, it } from "vitest";
import { centeredSquare } from "./compressFoodPhoto";

describe("centeredSquare", () => {
  it("cuts the middle of a landscape photo", () => {
    expect(centeredSquare(4000, 3000)).toEqual({ x: 500, y: 0, size: 3000 });
  });

  it("cuts the middle of a portrait photo", () => {
    expect(centeredSquare(1080, 1920)).toEqual({ x: 0, y: 420, size: 1080 });
  });
});
