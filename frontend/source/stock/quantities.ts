import type { MeasurementUnit } from "../api/types";

export interface DisplayUnit {
  symbol: string;
  baseUnitsPerUnit: number;
}

export const displayUnits: Record<MeasurementUnit, DisplayUnit[]> = {
  gram: [
    { symbol: "g", baseUnitsPerUnit: 1 },
    { symbol: "kg", baseUnitsPerUnit: 1000 },
  ],
  milliliter: [
    { symbol: "ml", baseUnitsPerUnit: 1 },
    { symbol: "l", baseUnitsPerUnit: 1000 },
  ],
  piece: [{ symbol: "ks", baseUnitsPerUnit: 1 }],
};

const numberFormat = new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 3 });

export function parseDecimal(text: string): number | null {
  const normalized = text.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }
  return Number(normalized);
}

export function toBaseQuantity(value: number, unit: DisplayUnit): number {
  return Math.round(value * unit.baseUnitsPerUnit * 1000) / 1000;
}

export function fromBaseQuantity(baseQuantity: number, unit: DisplayUnit): number {
  return Math.round((baseQuantity / unit.baseUnitsPerUnit) * 1000) / 1000;
}

export function bestDisplayUnit(baseQuantity: number, baseUnit: MeasurementUnit): DisplayUnit {
  const units = displayUnits[baseUnit];
  const largerUnits = units.filter(
    (unit) => unit.baseUnitsPerUnit > 1 && baseQuantity >= unit.baseUnitsPerUnit,
  );
  return largerUnits.at(-1) ?? units[0];
}

export function formatQuantity(baseQuantity: number, baseUnit: MeasurementUnit): string {
  const unit = bestDisplayUnit(baseQuantity, baseUnit);
  return `${numberFormat.format(fromBaseQuantity(baseQuantity, unit))} ${unit.symbol}`;
}

export function findDisplayUnit(baseUnit: MeasurementUnit, unitSymbol: string): DisplayUnit {
  return displayUnits[baseUnit].find((unit) => unit.symbol === unitSymbol) ?? displayUnits[baseUnit][0];
}

export function parseBaseQuantity(
  text: string,
  baseUnit: MeasurementUnit,
  unitSymbol: string,
): number | null {
  const value = parseDecimal(text);
  if (value === null) {
    return null;
  }
  const baseQuantity = toBaseQuantity(value, findDisplayUnit(baseUnit, unitSymbol));
  return baseQuantity > 0 ? baseQuantity : null;
}
