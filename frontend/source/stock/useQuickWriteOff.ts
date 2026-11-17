import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { writeOffStock } from "../api/stockApi";
import type { StockItem } from "../api/types";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { vibrate } from "../components/haptics";
import { describeError } from "../errorMessages";
import { stockItemsQueryKey } from "./stockQueries";

export type QuickWriteOffReason = "eaten" | "spoiled";

export interface PendingWriteOff {
  stockItem: StockItem;
  reason: QuickWriteOffReason;
  quantity: number;
}

const undoMilliseconds = 5000;

export function edibleQuantity(stockItem: StockItem, userId: number | undefined): number {
  const reservedByOthers = stockItem.reservations
    .filter((reservation) => reservation.userId !== userId)
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
  return Math.max(stockItem.quantity - reservedByOthers, 0);
}

export function useQuickWriteOff(householdId: number) {
  const queryClient = useQueryClient();
  const { user } = useAuthentication();
  const [pending, setPending] = useState<PendingWriteOff | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<PendingWriteOff | null>(null);
  const timerRef = useRef<number | undefined>(undefined);

  const commit = useCallback(
    (writeOff: PendingWriteOff) => {
      writeOffStock(writeOff.stockItem.id, writeOff.reason, writeOff.quantity)
        .catch((caught: unknown) => setError(describeError(caught)))
        .finally(() => queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) }));
    },
    [householdId, queryClient],
  );

  const flush = useCallback(() => {
    window.clearTimeout(timerRef.current);
    if (pendingRef.current) {
      commit(pendingRef.current);
      pendingRef.current = null;
    }
  }, [commit]);

  useEffect(() => flush, [flush]);

  function start(stockItem: StockItem, reason: QuickWriteOffReason): boolean {
    const quantity = reason === "eaten" ? edibleQuantity(stockItem, user?.id) : stockItem.quantity;
    if (quantity <= 0) {
      return false;
    }
    flush();
    const writeOff = { stockItem, reason, quantity };
    pendingRef.current = writeOff;
    setPending(writeOff);
    setError(null);
    vibrate(30);
    timerRef.current = window.setTimeout(() => {
      flush();
      setPending(null);
    }, undoMilliseconds);
    return true;
  }

  function undo() {
    window.clearTimeout(timerRef.current);
    pendingRef.current = null;
    setPending(null);
  }

  return { pending, error, clearError: () => setError(null), start, undo, undoMilliseconds };
}
