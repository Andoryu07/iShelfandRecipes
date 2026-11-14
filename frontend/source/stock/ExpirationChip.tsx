import { Chip } from "@mui/material";
import { formatDate, texts } from "../translations/cs";
import { daysUntil, expirationStatus } from "./expiration";

export function expirationLabel(expirationDate: string | null, today: Date = new Date()): string {
  if (!expirationDate) {
    return texts.stock.noExpirationDate;
  }
  const days = daysUntil(expirationDate, today);
  if (days < 0) {
    return texts.stock.expired;
  }
  if (days === 0) {
    return texts.stock.today;
  }
  if (days === 1) {
    return texts.stock.tomorrow;
  }
  if (days <= 7) {
    return texts.stock.inDays(days);
  }
  return texts.stock.expiresOn(formatDate(expirationDate));
}

export function ExpirationChip({ expirationDate }: { expirationDate: string | null }) {
  const status = expirationStatus(expirationDate, new Date());
  const color = status === "expired" ? "error" : status === "soon" ? "warning" : "default";
  return (
    <Chip
      size="small"
      label={expirationLabel(expirationDate)}
      color={color}
      variant={status === "fresh" || status === "none" ? "outlined" : "filled"}
      sx={{ ml: 1, flexShrink: 0 }}
    />
  );
}
