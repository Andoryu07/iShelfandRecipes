import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useState } from "react";
import type { StorageLocation } from "../api/types";
import { baseUnitOf, FoodPicker, isNewFood, NewFoodFields, type FoodChoice } from "../stock/FoodPicker";
import { displayUnits } from "../stock/quantities";
import { QuantityInput } from "../stock/QuantityInput";
import { displayStorageLocationName, texts } from "../translations/cs";
import { isUnconfirmedEstimate, type ReviewItem } from "./reviewItems";

const unhealthyKinds = ["sweets", "saltySnacks", "sugaryDrinks", "alcohol", "tobacco"] as const;

interface ReviewItemCardProps {
  householdId: number;
  item: ReviewItem;
  storageLocations: StorageLocation[];
  error: string | undefined;
  onChange: (item: ReviewItem) => void;
  onRemove: () => void;
}

export function ReviewItemCard({
  householdId,
  item,
  storageLocations,
  error,
  onChange,
  onRemove,
}: ReviewItemCardProps) {
  const baseUnit = baseUnitOf(item.food);
  const [isExpanded, setIsExpanded] = useState(item.name === "");
  const isEstimate = isUnconfirmedEstimate(item);

  function changeFood(food: FoodChoice | null) {
    const newBaseUnit = baseUnitOf(food);
    const unitChanged = newBaseUnit !== baseUnit;
    onChange({
      ...item,
      food,
      addToStock: food === null ? false : item.addToStock,
      unitSymbol: unitChanged && newBaseUnit ? displayUnits[newBaseUnit][0].symbol : item.unitSymbol,
      quantityText: unitChanged ? "" : item.quantityText,
    });
  }

  if (!isExpanded && !error) {
    const summary = [
      item.addToStock && item.quantityText ? `${item.quantityText} ${item.unitSymbol}` : null,
      item.addToStock
        ? isNewFood(item.food)
          ? texts.receipts.newFoodShort
          : null
        : texts.receipts.notToStock,
      item.remembered ? texts.receipts.rememberedHint : null,
      !isEstimate && item.addToStock && item.quantitySource === "history"
        ? texts.receipts.quantityFromHistory
        : null,
      !isEstimate && item.addToStock && item.quantitySource === "catalog"
        ? texts.receipts.quantityFromCatalog
        : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          pr: 2,
          borderBottom: 1,
          borderColor: "divider",
          ...(isEstimate
            ? {
                bgcolor: (theme) => alpha(theme.palette.warning.main, 0.12),
                borderLeft: 4,
                borderLeftColor: "warning.main",
              }
            : {}),
        }}
      >
        <Checkbox
          checked={item.addToStock}
          disabled={item.food === null}
          onChange={(event) => onChange({ ...item, addToStock: event.target.checked })}
          slotProps={{ input: { "aria-label": texts.receipts.addToStock } }}
        />
        <Box onClick={() => setIsExpanded(true)} sx={{ flex: 1, minWidth: 0, py: 1.25, cursor: "pointer" }}>
          <Typography sx={{ fontWeight: 600 }} noWrap>
            {item.name || item.originalText}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {isEstimate && (
              <Chip
                label={texts.receipts.estimateChip}
                size="small"
                color="warning"
                icon={<WarningAmberRoundedIcon />}
                sx={{ mr: 0.75, height: 20, fontWeight: 700 }}
              />
            )}
            {summary || item.originalText}
          </Typography>
        </Box>
        <Typography sx={{ fontWeight: 600, ml: 1, whiteSpace: "nowrap" }} onClick={() => setIsExpanded(true)}>
          {item.priceText}
        </Typography>
      </Box>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{ m: 1, borderColor: error ? "error.main" : isEstimate ? "warning.main" : undefined }}
    >
      <CardContent>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            {texts.receipts.originalText(item.originalText)}
            {item.remembered ? ` · ${texts.receipts.rememberedHint}` : ""}
          </Typography>
          <Button size="small" onClick={() => setIsExpanded(false)}>
            {texts.receipts.collapse}
          </Button>
          <IconButton size="small" aria-label={texts.receipts.removeItem} onClick={onRemove}>
            <DeleteOutlineRoundedIcon fontSize="small" />
          </IconButton>
        </Stack>
        <Stack direction="row" spacing={1} useFlexGap>
          <TextField
            label={texts.receipts.itemName}
            value={item.name}
            onChange={(event) => onChange({ ...item, name: event.target.value })}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
          <TextField
            label={texts.receipts.price}
            value={item.priceText}
            onChange={(event) => onChange({ ...item, priceText: event.target.value })}
            sx={{ width: 130, flexShrink: 0 }}
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
        </Stack>
        <FormControlLabel
          control={
            <Checkbox
              checked={item.addToStock}
              onChange={(event) => onChange({ ...item, addToStock: event.target.checked })}
            />
          }
          label={texts.receipts.addToStock}
        />
        <TextField
          select
          label={texts.unhealthy.label}
          value={item.unhealthyKind ?? "none"}
          onChange={(event) =>
            onChange({ ...item, unhealthyKind: event.target.value as ReviewItem["unhealthyKind"] })
          }
          sx={{ mt: 0.5 }}
        >
          <MenuItem value="none">{texts.unhealthy.none}</MenuItem>
          {unhealthyKinds.map((kind) => (
            <MenuItem key={kind} value={kind}>
              {texts.unhealthy.kinds[kind]}
            </MenuItem>
          ))}
        </TextField>
        {item.addToStock && (
          <>
            <FoodPicker householdId={householdId} value={item.food} onChange={changeFood} />
            {isNewFood(item.food) && <NewFoodFields value={item.food} onChange={changeFood} />}
            {baseUnit && (
              <QuantityInput
                label={texts.stock.quantity}
                baseUnit={baseUnit}
                value={item.quantityText}
                unitSymbol={item.unitSymbol}
                onValueChange={(quantityText) => onChange({ ...item, quantityText })}
                onUnitSymbolChange={(unitSymbol) => onChange({ ...item, unitSymbol })}
              />
            )}
            {isEstimate && (
              <Alert
                severity="warning"
                sx={{ mt: 1 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => onChange({ ...item, quantityConfirmed: true })}
                  >
                    {texts.receipts.estimateConfirm}
                  </Button>
                }
              >
                {item.quantitySource === "estimate"
                  ? texts.receipts.estimateFromModel
                  : texts.receipts.estimateTypical}
              </Alert>
            )}
            <Stack direction="row" spacing={1} useFlexGap>
              <TextField
                select
                label={texts.stock.storageLocation}
                value={item.storageLocationId ?? ""}
                onChange={(event) => onChange({ ...item, storageLocationId: Number(event.target.value) })}
              >
                {storageLocations.map((storageLocation) => (
                  <MenuItem key={storageLocation.id} value={storageLocation.id}>
                    {displayStorageLocationName(storageLocation)}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                type="date"
                label={texts.stock.expirationDate}
                value={item.expirationDate}
                onChange={(event) => onChange({ ...item, expirationDate: event.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </>
        )}
        {error && (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}
