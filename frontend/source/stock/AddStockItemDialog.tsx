import {
  Alert,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { createFood, createStockItem } from "../api/stockApi";
import type { Food, StorageLocation } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, formatDate, texts } from "../translations/cs";
import { localDateText } from "./expiration";
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

const dateShortcuts = [
  { label: texts.stock.inThreeDays, days: 3 },
  { label: texts.stock.inOneWeek, days: 7 },
  { label: texts.stock.inOneMonth, days: 30 },
];

function dateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return localDateText(date);
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
  const [isPickingDate, setIsPickingDate] = useState(false);
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [isEditingNewFood, setIsEditingNewFood] = useState(false);
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

  const matchingShortcut = dateShortcuts.find((shortcut) => dateAfterDays(shortcut.days) === expirationDate);

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
          {isNewFood(food) &&
            (isEditingNewFood ? (
              <NewFoodFields value={food} onChange={changeFood} />
            ) : (
              <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 1 }}>
                <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                  {texts.receipts.newFoodSummary(
                    texts.units[food.baseUnit],
                    texts.foodCategories[food.category],
                    food.genericName,
                  )}
                </Typography>
                <Button size="small" onClick={() => setIsEditingNewFood(true)}>
                  {texts.receipts.editNewFood}
                </Button>
              </Stack>
            ))}
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
            {texts.stock.expirationDate}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
            <Chip
              label={texts.stock.noExpirationDate}
              color={!expirationDate && !isPickingDate ? "primary" : "default"}
              onClick={() => {
                setExpirationDate("");
                setIsPickingDate(false);
              }}
            />
            {dateShortcuts.map((shortcut) => (
              <Chip
                key={shortcut.days}
                label={shortcut.label}
                color={matchingShortcut === shortcut && !isPickingDate ? "primary" : "default"}
                onClick={() => {
                  setExpirationDate(dateAfterDays(shortcut.days));
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
              value={expirationDate}
              onChange={(event) => setExpirationDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          )}
          {expirationDate && !isPickingDate && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {texts.stock.expiresOn(formatDate(expirationDate))}
            </Typography>
          )}
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
