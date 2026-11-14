import { Chip, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { formatDate, texts } from "../translations/cs";
import { localDateText } from "./expiration";

const dateShortcuts = [
  { label: texts.stock.inOneDay, days: 1 },
  { label: texts.stock.inThreeDays, days: 3 },
  { label: texts.stock.inOneWeek, days: 7 },
  { label: texts.stock.inOneMonth, days: 30 },
];

export function dateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateText(date);
}

function findShortcut(value: string) {
  return dateShortcuts.find((shortcut) => dateAfterDays(shortcut.days) === value);
}

interface ExpirationDatePickerProps {
  value: string;
  onChange: (value: string) => void;
}

export function ExpirationDatePicker({ value, onChange }: ExpirationDatePickerProps) {
  const [isPickingDate, setIsPickingDate] = useState(Boolean(value) && !findShortcut(value));
  const matchingShortcut = findShortcut(value);

  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        {texts.stock.expirationDate}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        <Chip
          label={texts.stock.noExpirationDate}
          color={!value && !isPickingDate ? "primary" : "default"}
          onClick={() => {
            onChange("");
            setIsPickingDate(false);
          }}
        />
        {dateShortcuts.map((shortcut) => (
          <Chip
            key={shortcut.days}
            label={shortcut.label}
            color={matchingShortcut === shortcut && !isPickingDate ? "primary" : "default"}
            onClick={() => {
              onChange(dateAfterDays(shortcut.days));
              setIsPickingDate(false);
            }}
          />
        ))}
        <Chip
          label={texts.stock.pickDate}
          color={isPickingDate ? "primary" : "default"}
          onClick={() => setIsPickingDate(true)}
        />
      </Stack>
      {isPickingDate && (
        <TextField
          type="date"
          label={texts.stock.expirationDate}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      )}
      {value && !isPickingDate && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {texts.stock.expiresOn(formatDate(value))}
        </Typography>
      )}
    </>
  );
}
