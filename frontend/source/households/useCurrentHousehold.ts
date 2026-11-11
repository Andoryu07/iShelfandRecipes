import { useQuery } from "@tanstack/react-query";
import { listHouseholds } from "../api/householdsApi";

export const householdsQueryKey = ["households"];

export function useCurrentHousehold() {
  const query = useQuery({ queryKey: householdsQueryKey, queryFn: listHouseholds });
  return { ...query, household: query.data?.[0] ?? null };
}
