import { localDateText } from "../stock/expiration";
import { formatDate, texts } from "../translations/cs";

export interface DayGroup<Item> {
  label: string;
  items: Item[];
}

export function groupByDay<Item extends { createdAt: string }>(items: Item[], now: Date): DayGroup<Item>[] {
  const today = localDateText(now);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = localDateText(yesterdayDate);
  const groups: DayGroup<Item>[] = [];
  let currentDay: string | null = null;
  for (const item of items) {
    const day = localDateText(new Date(item.createdAt));
    if (day !== currentDay) {
      currentDay = day;
      const label =
        day === today ? texts.history.today : day === yesterday ? texts.history.yesterday : formatDate(day);
      groups.push({ label, items: [] });
    }
    groups[groups.length - 1].items.push(item);
  }
  return groups;
}
