const storageKey = "iShelf.vibrations";

export function isVibrationEnabled(): boolean {
  try {
    return localStorage.getItem(storageKey) !== "off";
  } catch {
    return true;
  }
}

export function setVibrationEnabled(enabled: boolean) {
  try {
    localStorage.setItem(storageKey, enabled ? "on" : "off");
  } catch {
    // The choice is only a convenience on this device.
  }
}

export function canVibrate(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.vibrate === "function";
}

export function vibrate(pattern: number | number[] = 15) {
  if (canVibrate() && isVibrationEnabled()) {
    navigator.vibrate(pattern);
  }
}
