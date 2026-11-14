import {
  Alert,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { createFood, createStockItem } from "../api/stockApi";
import type { Food, StorageLocation } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, texts } from "../translations/cs";
import { ExpirationDatePicker } from "./ExpirationDatePicker";
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
  recentFoods: Food[];
  onClose: () => void;
}

export function AddStockItemDialog({
  householdId,
  storageLocations,
  initialStorageLocationId,
  recentFoods,
  onClose,
}: AddStockItemDialogProps) {
  const queryClient = useQueryClient();
  const [food, setFood] = useState<FoodChoice | null>(null);
  const [pickerKey, setPickerKey] = useState(0);
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

  function pickRecentFood(recentFood: Food) {
    changeFood(recentFood);
    setPickerKey((key) => key + 1);
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
    <BottomSheet open onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{texts.stock.addStockItem}</DialogTitle>
        <DialogContent>
          <FoodPicker key={pickerKey} householdId={householdId} value={food} onChange={changeFood} required />
          {recentFoods.length > 0 && !food && (
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                {texts.stock.recentFoods}
              </Typography>
              {recentFoods.map((recentFood) => (
                <Chip
                  key={recentFood.id}
                  label={recentFood.name}
                  onClick={() => pickRecentFood(recentFood)}
                />
              ))}
            </Stack>
          )}
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
            {texts.stock.storageLocation}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            {storageLocations.map((storageLocation) => (
              <Chip
                key={storageLocation.id}
                label={displayStorageLocationName(storageLocation)}
                color={storageLocation.id === storageLocationId ? "primary" : "default"}
                onClick={() => setStorageLocationId(storageLocation.id)}
              />
            ))}
          </Stack>
          <ExpirationDatePicker value={expirationDate} onChange={setExpirationDate} />
          {saveMutation.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {describeError(saveMutation.error, { 409: texts.stock.foodAlreadyExists })}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>{texts.common.cancel}</Button>
          <Button type="submit" variant="contained" size="large" disabled={!food || saveMutation.isPending}>
            {texts.common.add}
          </Button>
        </DialogActions>
      </form>
    </BottomSheet>
  );
}
