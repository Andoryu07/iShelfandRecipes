import { useQuery } from "@tanstack/react-query";
import { listStorageLocations } from "../api/householdsApi";

export function storageLocationsQueryKey(householdId: number) {
  return ["households", householdId, "storageLocations"];
}

export function useStorageLocations(householdId: number) {
  return useQuery({
    queryKey: storageLocationsQueryKey(householdId),
    queryFn: () => listStorageLocations(householdId),
  });
}
