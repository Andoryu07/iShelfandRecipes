import { describe, expect, it } from "vitest";
import { expandUpcE, isProductBarcode } from "./barcodeDetection";

describe("isProductBarcode", () => {
  it("accepts codes with a correct check digit", () => {
    expect(isProductBarcode("8594002934019")).toBe(true);
    expect(isProductBarcode("5449000000996")).toBe(true);
    expect(isProductBarcode("96385074")).toBe(true);
    expect(isProductBarcode("036000291452")).toBe(true);
    expect(isProductBarcode("04252614")).toBe(true);
  });

  it("rejects codes where one digit was misread", () => {
    expect(isProductBarcode("8594002934018")).toBe(false);
    expect(isProductBarcode("5449000000896")).toBe(false);
    expect(isProductBarcode("96385075")).toBe(false);
  });

  it("rejects codes of other lengths", () => {
    expect(isProductBarcode("123456")).toBe(false);
    expect(isProductBarcode("12345678901")).toBe(false);
    expect(isProductBarcode("")).toBe(false);
  });
});

describe("expandUpcE", () => {
  it("expands a short UPC-E code to UPC-A", () => {
    expect(expandUpcE("04252614")).toBe("042100005264");
    expect(expandUpcE("23456789")).toBeNull();
  });
});
