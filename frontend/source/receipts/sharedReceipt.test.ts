import { describe, expect, it } from "vitest";
import { isSupportedReceiptFile } from "./sharedReceipt";

describe("shared receipt", () => {
  it("accepts images and PDF only", () => {
    expect(isSupportedReceiptFile(new File(["x"], "a.jpg", { type: "image/jpeg" }))).toBe(true);
    expect(isSupportedReceiptFile(new File(["x"], "a.pdf", { type: "application/pdf" }))).toBe(true);
    expect(isSupportedReceiptFile(new File(["x"], "a.txt", { type: "text/plain" }))).toBe(false);
    expect(isSupportedReceiptFile(new File(["x"], "a", { type: "" }))).toBe(false);
  });
});
