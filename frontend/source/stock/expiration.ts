export type ExpirationStatus = "none" | "expired" | "soon" | "fresh";

export const expiringSoonDays = 3;

export function localDateText(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function daysUntil(expirationDate: string, today: Date): number {
  const [year, month, day] = expirationDate.split("-").map(Number);
  const expiration = Date.UTC(year, month - 1, day);
  const todayUtc = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((expiration - todayUtc) / 86_400_000);
}

export function expirationStatus(expirationDate: string | null, today: Date): ExpirationStatus {
  if (!expirationDate) {
    return "none";
  }
  const remainingDays = daysUntil(expirationDate, today);
  if (remainingDays < 0) {
    return "expired";
  }
  return remainingDays <= expiringSoonDays ? "soon" : "fresh";
}
