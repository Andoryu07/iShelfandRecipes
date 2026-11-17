import QrCodeScannerRoundedIcon from "@mui/icons-material/QrCodeScannerRounded";
import {
  Alert,
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { lookUpBarcode } from "../api/catalogApi";
import { createFood, createStockItem, getLastAddedQuantity, updateFood } from "../api/stockApi";
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
  newFoodFromCatalog,
  newFoodRequest,
  type FoodChoice,
} from "./FoodPicker";
import { BarcodeScannerDialog } from "./BarcodeScannerDialog";
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
  const [isScanning, setIsScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [barcodeNotice, setBarcodeNotice] = useState<{
    severity: "info" | "success" | "warning" | "error";
    text: string;
  } | null>(null);
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
  const catalogProduct = isNewFood(food) ? food.catalogProduct : undefined;
  const catalogQuantity =
    catalogProduct?.quantity && catalogProduct.unit === baseUnit ? catalogProduct.quantity : null;
  const lastQuantity = existingFoodId !== null ? lastQuantityQuery.data?.quantity : catalogQuantity;
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
      let savedFood = isNewFood(food) ? await createFood(householdId, newFoodRequest(food)) : food!;
      if (scannedBarcode && !isNewFood(food) && savedFood.barcode !== scannedBarcode) {
        savedFood = await updateFood(savedFood.id, { barcode: scannedBarcode });
      }
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

  async function applyScannedBarcode(barcode: string) {
    setIsScanning(false);
    setScannedBarcode(barcode);
    setBarcodeNotice({ severity: "info", text: texts.barcodes.looking });
    try {
      const result = await lookUpBarcode(householdId, barcode);
      if (result.food) {
        changeFood(result.food);
        setBarcodeNotice({ severity: "success", text: texts.barcodes.knownFood(result.food.name) });
      } else if (result.catalogProduct) {
        changeFood({ ...newFoodFromCatalog(result.catalogProduct), barcode });
        setBarcodeNotice({ severity: "warning", text: texts.barcodes.fromCatalog });
      } else {
        changeFood(null);
        setBarcodeNotice({ severity: "info", text: texts.barcodes.notFound(barcode) });
      }
      setPickerKey((key) => key + 1);
    } catch {
      setBarcodeNotice({ severity: "error", text: texts.barcodes.lookupFailed });
    }
  }

  function changeFood(choice: FoodChoice | null) {
    if (foodKey(choice) !== foodKey(food)) {
      setTypedQuantityText(null);
      setTypedUnitSymbol(null);
    } else if (baseUnitOf(choice) !== baseUnit) {
      setTypedUnitSymbol(null);
    }
    setFood(
      isNewFood(choice) && scannedBarcode && !choice.barcode
        ? { ...choice, barcode: scannedBarcode }
        : choice,
    );
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
          <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <FoodPicker
                key={pickerKey}
                householdId={householdId}
                value={food}
                onChange={changeFood}
                required
              />
            </Box>
            <IconButton
              aria-label={texts.barcodes.scan}
              onClick={() => setIsScanning(true)}
              sx={{ mt: 1, border: 1, borderColor: "divider" }}
            >
              <QrCodeScannerRoundedIcon />
            </IconButton>
          </Stack>
          {barcodeNotice && (
            <Alert severity={barcodeNotice.severity} onClose={() => setBarcodeNotice(null)} sx={{ mt: 1 }}>
              {barcodeNotice.text}
            </Alert>
          )}
          {isScanning && (
            <BarcodeScannerDialog onDetected={applyScannedBarcode} onClose={() => setIsScanning(false)} />
          )}
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
              helperText={
                isPrefilled
                  ? catalogQuantity !== null && existingFoodId === null
                    ? texts.stock.prefilledFromCatalog
                    : texts.stock.prefilledFromLastTime
                  : null
              }
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
        isFromCatalog={catalogQuantity !== null && existingFoodId === null}
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
