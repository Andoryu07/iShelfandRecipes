import { useEffect } from "react";

export const isWakeLockSupported = typeof navigator !== "undefined" && "wakeLock" in navigator;

export function useWakeLock(isEnabled: boolean): void {
  useEffect(() => {
    if (!isEnabled || !isWakeLockSupported) {
      return;
    }
    let sentinel: WakeLockSentinel | null = null;
    let isActive = true;
    async function acquire() {
      if (!isActive || document.visibilityState !== "visible" || (sentinel && !sentinel.released)) {
        return;
      }
      try {
        sentinel = await navigator.wakeLock.request("screen");
        if (!isActive) {
          await sentinel.release();
        }
      } catch {
        sentinel = null;
      }
    }
    void acquire();
    document.addEventListener("visibilitychange", acquire);
    return () => {
      isActive = false;
      document.removeEventListener("visibilitychange", acquire);
      void sentinel?.release().catch(() => undefined);
    };
  }, [isEnabled]);
}
