export function monthText(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function shiftMonthText(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return monthText(new Date(year, monthNumber - 1 + offset, 1));
}

const longFormat = new Intl.DateTimeFormat("cs-CZ", { month: "long", year: "numeric" });
const shortFormat = new Intl.DateTimeFormat("cs-CZ", { month: "short" });
const genitiveMonths = [
  "lednu",
  "únoru",
  "březnu",
  "dubnu",
  "květnu",
  "červnu",
  "červenci",
  "srpnu",
  "září",
  "říjnu",
  "listopadu",
  "prosinci",
];

function toDate(month: string): Date {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber - 1, 1);
}

export function formatMonthLong(month: string): string {
  const text = longFormat.format(toDate(month));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatMonthShort(month: string): string {
  return shortFormat.format(toDate(month)).replace(".", "");
}

export function monthLocative(month: string): string {
  return genitiveMonths[toDate(month).getMonth()];
}

export function changePercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return null;
  }
  return Math.round(((current - previous) / previous) * 100);
}
