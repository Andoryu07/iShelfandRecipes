import {
  Chip,
  InputAdornment,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import type { Ref } from "react";
import type { MeasurementUnit } from "../api/types";
import { commonQuantities, displayUnits, formatQuantity, quantityText } from "./quantities";

interface QuantityInputProps {
  label: string;
  baseUnit: MeasurementUnit;
  value: string;
  unitSymbol: string;
  onValueChange: (value: string) => void;
  onUnitSymbolChange: (unitSymbol: string) => void;
  error?: string | null;
  helperText?: string | null;
  autoFocus?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  showCommonQuantities?: boolean;
}

export function QuantityInput({
  label,
  baseUnit,
  value,
  unitSymbol,
  onValueChange,
  onUnitSymbolChange,
  error,
  helperText,
  autoFocus,
  inputRef,
  showCommonQuantities,
}: QuantityInputProps) {
  const units = displayUnits[baseUnit];
  const selectedSymbol = units.some((unit) => unit.symbol === unitSymbol) ? unitSymbol : units[0].symbol;
  const unitAdornment =
    units.length === 1 ? (
      <Typography color="text.secondary">{units[0].symbol}</Typography>
    ) : (
      <ToggleButtonGroup
        exclusive
        size="small"
        value={selectedSymbol}
        onChange={(_, symbol: string | null) => symbol && onUnitSymbolChange(symbol)}
        onMouseDown={(event) => event.preventDefault()}
      >
        {units.map((unit) => (
          <ToggleButton
            key={unit.symbol}
            value={unit.symbol}
            sx={{ px: 1.5, py: 0.25, textTransform: "none" }}
          >
            {unit.symbol}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    );
  return (
    <>
      <TextField
        label={label}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        error={Boolean(error)}
        helperText={error ?? helperText}
        autoFocus={autoFocus}
        inputRef={inputRef}
        slotProps={{
          htmlInput: { inputMode: "decimal", autoComplete: "off", enterKeyHint: "done" },
          input: { endAdornment: <InputAdornment position="end">{unitAdornment}</InputAdornment> },
        }}
      />
      {showCommonQuantities && (
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 1 }}>
          {commonQuantities[baseUnit].map((baseQuantity) => (
            <Chip
              key={baseQuantity}
              size="small"
              variant="outlined"
              label={formatQuantity(baseQuantity, baseUnit)}
              onClick={() => {
                const { text, unitSymbol: symbol } = quantityText(baseQuantity, baseUnit);
                onValueChange(text);
                onUnitSymbolChange(symbol);
              }}
            />
          ))}
        </Stack>
      )}
    </>
  );
}
