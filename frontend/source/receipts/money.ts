const moneyFormat = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" });

export function formatMoney(amount: number): string {
  return moneyFormat.format(amount);
}

export function parseMoney(text: string): number | null {
  const normalized = text
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".")
    .replace(/(Kč|CZK)$/i, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

export function moneyText(amount: number): string {
  return amount.toFixed(2).replace(".", ",");
}

export function sumMoney(amounts: number[]): number {
  return Math.round(amounts.reduce((sum, amount) => sum + Math.round(amount * 100), 0)) / 100;
}
