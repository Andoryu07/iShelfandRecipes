import { useQuery } from "@tanstack/react-query";
import { listHouseholds } from "../api/householdsApi";
import { defaultExpirationWarningDays } from "../stock/expiration";

export const householdsQueryKey = ["households"];

export function useCurrentHousehold() {
  const query = useQuery({ queryKey: householdsQueryKey, queryFn: listHouseholds });
  return { ...query, household: query.data?.[0] ?? null };
}

export function useExpirationWarningDays(): number {
  return useCurrentHousehold().household?.expirationWarningDays ?? defaultExpirationWarningDays;
}
