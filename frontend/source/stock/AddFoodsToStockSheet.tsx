import {
  Alert,
  Box,
  Button,
  Checkbox,
  Collapse,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { createStockItem } from "../api/stockApi";
import type { StorageLocation } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { StorageLocationChips } from "../components/StorageLocationChips";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { describeError } from "../errorMessages";
import { ExpirationDatePicker } from "./ExpirationDatePicker";
import { parseBaseQuantity } from "./quantities";
import { QuantityInput } from "./QuantityInput";
import { displayStorageLocationName, formatDate, texts } from "../translations/cs";
import { buildFoodRows, type FoodRow, type FoodToAdd } from "../recipes/missingFoods";

interface AddFoodsToStockSheetProps {
  householdId: number;
  items: FoodToAdd[];
  title: string;
  hint: string;
  storageLocations: StorageLocation[];
  onClose: () => void;
  onAdded: (addedKeys: number[]) => Promise<void>;
}

export function AddFoodsToStockSheet({
  householdId,
  items,
  title,
  hint,
  storageLocations,
  onClose,
  onAdded,
}: AddFoodsToStockSheetProps) {
  const [rows, setRows] = useState(() => buildFoodRows(items, storageLocations));
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [invalidIds, setInvalidIds] = useState<number[]>([]);
  const itemsByKey = new Map(items.map((item) => [item.key, item]));
  const selectedRows = rows.filter((row) => row.isSelected);

  const saveMutation = useMutation({
    mutationFn: async (requests: { row: FoodRow; quantity: number }[]) => {
      const addedKeys: number[] = [];
      for (const { row, quantity } of requests) {
        await createStockItem(householdId, {
          foodId: itemsByKey.get(row.key)!.food.id,
          storageLocationId: row.storageLocationId,
          quantity,
          expirationDate: row.expirationDate || null,
        });
        addedKeys.push(row.key);
        setRows((current) => current.filter((other) => other.key !== row.key));
      }
      return addedKeys;
    },
    onSuccess: onAdded,
  });

  function updateRow(changed: FoodRow) {
    setRows((current) => current.map((row) => (row.key === changed.key ? changed : row)));
  }

  function save() {
    const requests = selectedRows.map((row) => ({
      row,
      quantity: parseBaseQuantity(row.quantityText, itemsByKey.get(row.key)!.food.baseUnit, row.unitSymbol),
    }));
    const invalid = requests.filter((request) => request.quantity === null).map((request) => request.row.key);
    setInvalidIds(invalid);
    if (invalid.length > 0) {
      setExpandedId(invalid[0]);
      return;
    }
    saveMutation.mutate(requests.map(({ row, quantity }) => ({ row, quantity: quantity! })));
  }

  return (
    <BottomSheet open onClose={onClose}>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {hint}
        </Typography>
        <Stack spacing={1}>
          {rows.map((row) => {
            const { food } = itemsByKey.get(row.key)!;
            const storageLocation = storageLocations.find(
              (location) => location.id === row.storageLocationId,
            );
            const isExpanded = expandedId === row.key;
            const isInvalid = invalidIds.includes(row.key);
            return (
              <Box
                key={row.key}
                sx={{
                  border: 1,
                  borderColor: isInvalid ? "error.main" : "divider",
                  borderRadius: "12px",
                  opacity: row.isSelected ? 1 : 0.6,
                }}
              >
                <Stack direction="row" sx={{ alignItems: "center", gap: 1, pr: 1 }}>
                  <Checkbox
                    checked={row.isSelected}
                    onChange={(event) => updateRow({ ...row, isSelected: event.target.checked })}
                    slotProps={{ input: { "aria-label": food.name } }}
                  />
                  <CategoryAvatar
                    category={food.category}
                    genericName={food.genericName}
                    icon={food.icon}
                    photoUrl={food.photoUrl}
                    size={32}
                  />
                  <Box
                    role="button"
                    tabIndex={0}
                    sx={{ flex: 1, py: 1, cursor: "pointer", minWidth: 0 }}
                    onClick={() => setExpandedId(isExpanded ? null : row.key)}
                  >
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {food.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" noWrap>
                      {[
                        `${row.quantityText} ${row.unitSymbol}`,
                        storageLocation ? displayStorageLocationName(storageLocation) : null,
                        row.expirationDate ? texts.stock.expiresOn(formatDate(row.expirationDate)) : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </Typography>
                  </Box>
                  <Typography color="text.secondary">{isExpanded ? "▾" : "▸"}</Typography>
                </Stack>
                <Collapse in={isExpanded} unmountOnExit>
                  <Box sx={{ px: 2, pb: 2 }}>
                    <QuantityInput
                      label={texts.stock.quantity}
                      baseUnit={food.baseUnit}
                      value={row.quantityText}
                      unitSymbol={row.unitSymbol}
                      onValueChange={(quantityText) => updateRow({ ...row, quantityText })}
                      onUnitSymbolChange={(unitSymbol) => updateRow({ ...row, unitSymbol })}
                      error={isInvalid ? texts.stock.invalidQuantity : null}
                    />
                    <StorageLocationChips
                      storageLocations={storageLocations}
                      value={row.storageLocationId}
                      onChange={(storageLocationId) => updateRow({ ...row, storageLocationId })}
                    />
                    <ExpirationDatePicker
                      value={row.expirationDate}
                      onChange={(expirationDate) => updateRow({ ...row, expirationDate })}
                    />
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Stack>
        {saveMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {describeError(saveMutation.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button
          variant="contained"
          size="large"
          onClick={save}
          disabled={selectedRows.length === 0 || saveMutation.isPending}
        >
          {texts.recipes.addMissingConfirm(selectedRows.length)}
        </Button>
      </DialogActions>
    </BottomSheet>
  );
}
