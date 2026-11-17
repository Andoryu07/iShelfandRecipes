import { apiRequest } from "./apiClient";
import type { CatalogProduct } from "./types";

export function searchCatalogProducts(search: string): Promise<CatalogProduct[]> {
  return apiRequest<CatalogProduct[]>(`/catalog/products?${new URLSearchParams({ search, limit: "5" })}`);
}

export function getCatalogProduct(barcode: string): Promise<CatalogProduct> {
  return apiRequest<CatalogProduct>(`/catalog/products/${encodeURIComponent(barcode)}`);
}
