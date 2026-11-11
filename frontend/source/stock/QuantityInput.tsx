import { MenuItem, Stack, TextField } from "@mui/material";
import type { MeasurementUnit } from "../api/types";
import { texts } from "../translations/cs";
import { displayUnits } from "./quantities";

interface QuantityInputProps {
  label: string;
  baseUnit: MeasurementUnit;
  value: string;
  unitSymbol: string;
  onValueChange: (value: string) => void;
  onUnitSymbolChange: (unitSymbol: string) => void;
  error?: string | null;
  autoFocus?: boolean;
}

export function QuantityInput({
  label,
  baseUnit,
  value,
  unitSymbol,
  onValueChange,
  onUnitSymbolChange,
  error,
  autoFocus,
}: QuantityInputProps) {
  const units = displayUnits[baseUnit];
  return (
    <Stack direction="row" spacing={1}>
      <TextField
        label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        error={Boolean(error)}
        helperText={error}
        autoFocus={autoFocus}
        slotProps={{ htmlInput: { inputMode: "decimal", autoComplete: "off" } }}
      />
      <TextField
        select
        label={texts.stock.unit}
        value={units.some((unit) => unit.symbol === unitSymbol) ? unitSymbol : units[0].symbol}
        onChange={(event) => onUnitSymbolChange(event.target.value)}
        sx={{ width: 110, flexShrink: 0 }}
      >
        {units.map((unit) => (
          <MenuItem key={unit.symbol} value={unit.symbol}>
            {unit.symbol}
          </MenuItem>
        ))}
      </TextField>
    </Stack>
  );
}
