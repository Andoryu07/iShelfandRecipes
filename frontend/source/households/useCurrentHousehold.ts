import { useQuery, type QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { listHouseholds } from "../api/householdsApi";
import type { Household } from "../api/types";
import { planQueryKey } from "../plans/usePlan";
import { defaultExpirationWarningDays } from "../stock/expiration";

export const householdsQueryKey = ["households"];
const storageKey = "iShelf.currentHouseholdId";
const listeners = new Set<() => void>();

function readStoredHouseholdId(): number | null {
  try {
    const value = Number(localStorage.getItem(storageKey));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

let selectedHouseholdId = readStoredHouseholdId();

export function selectHousehold(householdId: number) {
  selectedHouseholdId = householdId;
  try {
    localStorage.setItem(storageKey, String(householdId));
  } catch {
    // Remembering the household is only a convenience.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useCurrentHousehold() {
  const query = useQuery({ queryKey: householdsQueryKey, queryFn: listHouseholds });
  const selectedId = useSyncExternalStore(subscribe, () => selectedHouseholdId);
  const households = query.data ?? [];
  const household = households.find((candidate) => candidate.id === selectedId) ?? households[0] ?? null;
  return { ...query, households, household };
}

export async function refreshHouseholds(queryClient: QueryClient, addedHousehold?: Household) {
  if (addedHousehold) {
    queryClient.setQueryData<Household[]>(householdsQueryKey, (current) =>
      current && !current.some((household) => household.id === addedHousehold.id)
        ? [...current, addedHousehold]
        : current,
    );
  }
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: householdsQueryKey }),
    queryClient.invalidateQueries({ queryKey: planQueryKey }),
  ]);
}

export function useExpirationWarningDays(): number {
  return useCurrentHousehold().household?.expirationWarningDays ?? defaultExpirationWarningDays;
}
