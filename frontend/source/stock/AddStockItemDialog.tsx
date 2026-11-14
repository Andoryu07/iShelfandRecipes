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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createFood, createStockItem, getLastAddedQuantity } from "../api/stockApi";
import type { Food, StorageLocation } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { StorageLocationChips } from "../components/StorageLocationChips";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";
import { ExpirationDatePicker } from "./ExpirationDatePicker";
import {
  baseUnitOf,
  FoodPicker,
  isNewFood,
  NewFoodFields,
  newFoodRequest,
  type FoodChoice,
} from "./FoodPicker";
import {
  displayUnits,
  formatQuantity,
  parseBaseQuantity,
  quantityText as toQuantityText,
} from "./quantities";
import { PrefillWarningDialog, isPrefillWarningHidden } from "./PrefillWarningDialog";
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
  const [typedQuantityText, setTypedQuantityText] = useState<string | null>(null);
  const [typedUnitSymbol, setTypedUnitSymbol] = useState<string | null>(null);
  const [storageLocationId, setStorageLocationId] = useState(
    initialStorageLocationId ?? storageLocations[0]?.id ?? 0,
  );
  const [expirationDate, setExpirationDate] = useState("");
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const [pendingBaseQuantity, setPendingBaseQuantity] = useState<number | null>(null);
  const quantityInputRef = useRef<HTMLInputElement>(null);
  const existingFoodId = food && !isNewFood(food) ? food.id : null;
  const baseUnit = baseUnitOf(food);
  const lastQuantityQuery = useQuery({
    queryKey: ["foods", existingFoodId, "lastAddedQuantity"],
    queryFn: () => getLastAddedQuantity(existingFoodId!),
    enabled: existingFoodId !== null,
    staleTime: 0,
  });
  const lastQuantity = existingFoodId !== null ? lastQuantityQuery.data?.quantity : null;
  const prefill =
    baseUnit && lastQuantity != null
      ? { ...toQuantityText(lastQuantity, baseUnit), baseQuantity: lastQuantity }
      : null;
  const quantityText = typedQuantityText ?? prefill?.text ?? "";
  const unitSymbol =
    typedUnitSymbol ?? prefill?.unitSymbol ?? (baseUnit ? displayUnits[baseUnit][0].symbol : "g");
  const isPrefilled = prefill !== null && typedQuantityText === null && typedUnitSymbol === null;

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

  useEffect(() => {
    if (existingFoodId === null) {
      return;
    }
    const focusTimer = window.setTimeout(() => quantityInputRef.current?.focus(), 50);
    return () => window.clearTimeout(focusTimer);
  }, [existingFoodId]);

  function foodKey(choice: FoodChoice | null): string {
    if (choice === null) {
      return "";
    }
    return isNewFood(choice) ? `new:${choice.newFoodName}` : `food:${choice.id}`;
  }

  function changeFood(choice: FoodChoice | null) {
    if (foodKey(choice) !== foodKey(food)) {
      setTypedQuantityText(null);
      setTypedUnitSymbol(null);
    } else if (baseUnitOf(choice) !== baseUnit) {
      setTypedUnitSymbol(null);
    }
    setFood(choice);
  }

  function changeQuantityText(text: string) {
    setTypedQuantityText(text);
    setTypedUnitSymbol((current) => current ?? unitSymbol);
  }

  function changeUnitSymbol(symbol: string) {
    setTypedUnitSymbol(symbol);
    setTypedQuantityText((current) => current ?? quantityText);
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
    if (isPrefilled && !isPrefillWarningHidden()) {
      setPendingBaseQuantity(baseQuantity);
      return;
    }
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
              onValueChange={changeQuantityText}
              onUnitSymbolChange={changeUnitSymbol}
              error={quantityError}
              helperText={isPrefilled ? texts.stock.prefilledFromLastTime : null}
              inputRef={quantityInputRef}
              showCommonQuantities
            />
          )}
          <StorageLocationChips
            storageLocations={storageLocations}
            value={storageLocationId}
            onChange={setStorageLocationId}
          />
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
      <PrefillWarningDialog
        quantity={
          pendingBaseQuantity !== null && baseUnit ? formatQuantity(pendingBaseQuantity, baseUnit) : null
        }
        onConfirm={() => {
          saveMutation.mutate(pendingBaseQuantity!);
          setPendingBaseQuantity(null);
        }}
        onEdit={() => {
          setPendingBaseQuantity(null);
          quantityInputRef.current?.focus();
        }}
      />
    </BottomSheet>
  );
}
