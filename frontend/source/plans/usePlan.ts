import { useQuery } from "@tanstack/react-query";
import { getPlan } from "../api/plansApi";

export const planQueryKey = ["plan"];

export function usePlan() {
  return useQuery({ queryKey: planQueryKey, queryFn: getPlan });
}
