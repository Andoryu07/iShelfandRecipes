import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { createFood, createStockItem } from "../api/stockApi";
import type { StorageLocation } from "../api/types";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, texts } from "../translations/cs";
import {
  baseUnitOf,
  FoodPicker,
  isNewFood,
  NewFoodFields,
  newFoodRequest,
  type FoodChoice,
} from "./FoodPicker";
import { displayUnits, parseBaseQuantity } from "./quantities";
import { QuantityInput } from "./QuantityInput";
import { stockItemsQueryKey } from "./stockQueries";

interface AddStockItemDialogProps {
  householdId: number;
  storageLocations: StorageLocation[];
  initialStorageLocationId: number | undefined;
  onClose: () => void;
}

export function AddStockItemDialog({
  householdId,
  storageLocations,
  initialStorageLocationId,
  onClose,
}: AddStockItemDialogProps) {
  const queryClient = useQueryClient();
  const [food, setFood] = useState<FoodChoice | null>(null);
  const [quantityText, setQuantityText] = useState("");
  const [unitSymbol, setUnitSymbol] = useState("g");
  const [storageLocationId, setStorageLocationId] = useState(
    initialStorageLocationId ?? storageLocations[0]?.id ?? 0,
  );
  const [expirationDate, setExpirationDate] = useState("");
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const baseUnit = baseUnitOf(food);

  const saveMutation = useMutation({
    mutationFn: async (baseQuantity: number) => {
      const savedFood = isNewFood(food) ? await createFood(householdId, newFoodRequest(food)) : food!;
      setFood(savedFood);
      return createStockItem(householdId, {
        foodId: savedFood.id,
        storageLocationId,
        quantity: baseQuantity,
        expirationDate: expirationDate || null,
      });
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) }),
        queryClient.invalidateQueries({ queryKey: ["households", householdId, "foods"] }),
      ]);
      onClose();
    },
  });

  function changeFood(choice: FoodChoice | null) {
    setFood(choice);
    const unit = baseUnitOf(choice);
    if (unit) {
      setUnitSymbol(displayUnits[unit][0].symbol);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!baseUnit) {
      return;
    }
    const baseQuantity = parseBaseQuantity(quantityText, baseUnit, unitSymbol);
    if (baseQuantity === null) {
      setQuantityError(texts.stock.invalidQuantity);
      return;
    }
    setQuantityError(null);
    saveMutation.mutate(baseQuantity);
  }

  return (
    <Dialog open onClose={onClose} fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{texts.stock.addStockItem}</DialogTitle>
        <DialogContent>
          <FoodPicker householdId={householdId} value={food} onChange={changeFood} autoFocus required />
          {isNewFood(food) && <NewFoodFields value={food} onChange={changeFood} />}
          {baseUnit && (
            <QuantityInput
              label={texts.stock.quantity}
              baseUnit={baseUnit}
              value={quantityText}
              unitSymbol={unitSymbol}
              onValueChange={setQuantityText}
              onUnitSymbolChange={setUnitSymbol}
              error={quantityError}
            />
          )}
          <TextField
            select
            label={texts.stock.storageLocation}
            value={storageLocationId}
            onChange={(event) => setStorageLocationId(Number(event.target.value))}
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
            value={expirationDate}
            onChange={(event) => setExpirationDate(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {saveMutation.error && (
            <Alert severity="error">
              {describeError(saveMutation.error, { 409: texts.stock.foodAlreadyExists })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{texts.common.cancel}</Button>
          <Button type="submit" variant="contained" disabled={!food || saveMutation.isPending}>
            {texts.common.add}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
