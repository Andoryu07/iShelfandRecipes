import { useQuery } from "@tanstack/react-query";
import { listShoppingList } from "../api/shoppingListApi";

export function shoppingListQueryKey(householdId: number) {
  return ["households", householdId, "shoppingList"];
}

export function useShoppingList(householdId: number) {
  return useQuery({
    queryKey: shoppingListQueryKey(householdId),
    queryFn: () => listShoppingList(householdId),
  });
}
