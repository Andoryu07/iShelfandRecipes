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
import type { IngredientAvailability, StorageLocation } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { StorageLocationChips } from "../components/StorageLocationChips";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { describeError } from "../errorMessages";
import { ExpirationDatePicker } from "../stock/ExpirationDatePicker";
import { parseBaseQuantity } from "../stock/quantities";
import { QuantityInput } from "../stock/QuantityInput";
import { displayStorageLocationName, formatDate, texts } from "../translations/cs";
import { buildMissingFoodRows, type MissingFoodRow } from "./missingFoods";

interface AddMissingFoodsSheetProps {
  householdId: number;
  ingredients: IngredientAvailability[];
  storageLocations: StorageLocation[];
  onClose: () => void;
  onAdded: () => Promise<void>;
}

export function AddMissingFoodsSheet({
  householdId,
  ingredients,
  storageLocations,
  onClose,
  onAdded,
}: AddMissingFoodsSheetProps) {
  const [rows, setRows] = useState(() => buildMissingFoodRows(ingredients, storageLocations));
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [invalidIds, setInvalidIds] = useState<number[]>([]);
  const ingredientsById = new Map(ingredients.map((ingredient) => [ingredient.ingredientId, ingredient]));
  const selectedRows = rows.filter((row) => row.isSelected);

  const saveMutation = useMutation({
    mutationFn: async (requests: { row: MissingFoodRow; quantity: number }[]) => {
      for (const { row, quantity } of requests) {
        await createStockItem(householdId, {
          foodId: ingredientsById.get(row.ingredientId)!.food.id,
          storageLocationId: row.storageLocationId,
          quantity,
          expirationDate: row.expirationDate || null,
        });
        setRows((current) => current.filter((other) => other.ingredientId !== row.ingredientId));
      }
    },
    onSuccess: onAdded,
  });

  function updateRow(changed: MissingFoodRow) {
    setRows((current) => current.map((row) => (row.ingredientId === changed.ingredientId ? changed : row)));
  }

  function save() {
    const requests = selectedRows.map((row) => ({
      row,
      quantity: parseBaseQuantity(
        row.quantityText,
        ingredientsById.get(row.ingredientId)!.food.baseUnit,
        row.unitSymbol,
      ),
    }));
    const invalid = requests
      .filter((request) => request.quantity === null)
      .map((request) => request.row.ingredientId);
    setInvalidIds(invalid);
    if (invalid.length > 0) {
      setExpandedId(invalid[0]);
      return;
    }
    saveMutation.mutate(requests.map(({ row, quantity }) => ({ row, quantity: quantity! })));
  }

  return (
    <BottomSheet open onClose={onClose}>
      <DialogTitle>{texts.recipes.addMissingTitle}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {texts.recipes.addMissingHint}
        </Typography>
        <Stack spacing={1}>
          {rows.map((row) => {
            const { food } = ingredientsById.get(row.ingredientId)!;
            const storageLocation = storageLocations.find(
              (location) => location.id === row.storageLocationId,
            );
            const isExpanded = expandedId === row.ingredientId;
            const isInvalid = invalidIds.includes(row.ingredientId);
            return (
              <Box
                key={row.ingredientId}
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
                    size={32}
                  />
                  <Box
                    role="button"
                    tabIndex={0}
                    sx={{ flex: 1, py: 1, cursor: "pointer", minWidth: 0 }}
                    onClick={() => setExpandedId(isExpanded ? null : row.ingredientId)}
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
