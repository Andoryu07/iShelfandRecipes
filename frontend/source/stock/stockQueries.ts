export function stockItemsQueryKey(householdId: number) {
  return ["households", householdId, "stockItems"];
}

export function stockMovementsQueryKey(householdId: number, stockItemId: number) {
  return ["households", householdId, "stockItems", stockItemId, "movements"];
}
