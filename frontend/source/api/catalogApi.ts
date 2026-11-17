import { apiRequest } from "./apiClient";
import type { BarcodeLookup, CatalogProduct } from "./types";

export function searchCatalogProducts(search: string): Promise<CatalogProduct[]> {
  return apiRequest<CatalogProduct[]>(`/catalog/products?${new URLSearchParams({ search, limit: "5" })}`);
}

export function getCatalogProduct(barcode: string): Promise<CatalogProduct> {
  return apiRequest<CatalogProduct>(`/catalog/products/${encodeURIComponent(barcode)}`);
}

export function lookUpBarcode(householdId: number, barcode: string): Promise<BarcodeLookup> {
  return apiRequest<BarcodeLookup>(`/households/${householdId}/barcodes/${encodeURIComponent(barcode)}`);
}
