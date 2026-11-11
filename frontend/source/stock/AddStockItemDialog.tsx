import {
  Alert,
  Autocomplete,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDeferredValue, useState, type FormEvent } from "react";
import { createFood, createStockItem, searchFoods } from "../api/stockApi";
import {
  foodCategories,
  type Food,
  type FoodCategory,
  type MeasurementUnit,
  type StorageLocation,
} from "../api/types";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, texts } from "../translations/cs";
import { displayUnits, parseBaseQuantity } from "./quantities";
import { QuantityInput } from "./QuantityInput";
import { stockItemsQueryKey } from "./stockQueries";

type FoodOption = Food | { newFoodName: string };

interface AddStockItemDialogProps {
  householdId: number;
  storageLocations: StorageLocation[];
  initialStorageLocationId: number | undefined;
  onClose: () => void;
}

const measurementUnits: MeasurementUnit[] = ["gram", "milliliter", "piece"];

export function AddStockItemDialog({
  householdId,
  storageLocations,
  initialStorageLocationId,
  onClose,
}: AddStockItemDialogProps) {
  const queryClient = useQueryClient();
  const [foodInput, setFoodInput] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodOption | null>(null);
  const [newFoodCategory, setNewFoodCategory] = useState<FoodCategory>("other");
  const [newFoodBaseUnit, setNewFoodBaseUnit] = useState<MeasurementUnit>("gram");
  const [quantityText, setQuantityText] = useState("");
  const [unitSymbol, setUnitSymbol] = useState("g");
  const [storageLocationId, setStorageLocationId] = useState(
    initialStorageLocationId ?? storageLocations[0]?.id ?? 0,
  );
  const [expirationDate, setExpirationDate] = useState("");
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const searchText = useDeferredValue(foodInput.trim());
  const foodsQuery = useQuery({
    queryKey: ["households", householdId, "foods", searchText],
    queryFn: () => searchFoods(householdId, searchText),
    enabled: searchText.length > 0,
  });
  const foundFoods = foodsQuery.data ?? [];
  const exactMatch = foundFoods.find((food) => food.name.toLowerCase() === searchText.toLowerCase());
  const options: FoodOption[] =
    searchText && !exactMatch ? [...foundFoods, { newFoodName: searchText }] : foundFoods;
  const isNewFood = selectedFood !== null && "newFoodName" in selectedFood;
  const baseUnit =
    selectedFood === null ? null : isNewFood ? newFoodBaseUnit : (selectedFood as Food).baseUnit;

  const saveMutation = useMutation({
    mutationFn: async (baseQuantity: number) => {
      const food =
        selectedFood && "newFoodName" in selectedFood
          ? await createFood(householdId, {
              name: selectedFood.newFoodName,
              category: newFoodCategory,
              baseUnit: newFoodBaseUnit,
            })
          : (selectedFood as Food);
      setSelectedFood(food);
      return createStockItem(householdId, {
        foodId: food.id,
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

  function selectFood(option: FoodOption | null) {
    setSelectedFood(option);
    const unit = option && !("newFoodName" in option) ? option.baseUnit : newFoodBaseUnit;
    setUnitSymbol(displayUnits[unit][0].symbol);
  }

  function selectNewFoodBaseUnit(unit: MeasurementUnit) {
    setNewFoodBaseUnit(unit);
    setUnitSymbol(displayUnits[unit][0].symbol);
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
          <Autocomplete
            options={options}
            value={selectedFood}
            inputValue={foodInput}
            onInputChange={(_, value) => setFoodInput(value)}
            onChange={(_, option) => selectFood(option)}
            filterOptions={(currentOptions) => currentOptions}
            getOptionLabel={(option) => ("newFoodName" in option ? option.newFoodName : option.name)}
            getOptionKey={(option) => ("newFoodName" in option ? "new" : option.id)}
            isOptionEqualToValue={(option, value) =>
              "newFoodName" in option || "newFoodName" in value ? option === value : option.id === value.id
            }
            renderOption={(properties, option) => {
              const { key, ...otherProperties } = properties;
              return (
                <li key={key} {...otherProperties}>
                  {"newFoodName" in option ? texts.stock.createFoodOption(option.newFoodName) : option.name}
                </li>
              );
            }}
            noOptionsText={searchText ? texts.common.loading : texts.stock.startTyping}
            renderInput={(parameters) => (
              <TextField {...parameters} label={texts.stock.food} autoFocus required />
            )}
          />
          {isNewFood && (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {texts.stock.newFoodHint}
              </Typography>
              <TextField
                select
                label={texts.stock.baseUnit}
                value={newFoodBaseUnit}
                onChange={(event) => selectNewFoodBaseUnit(event.target.value as MeasurementUnit)}
              >
                {measurementUnits.map((unit) => (
                  <MenuItem key={unit} value={unit}>
                    {texts.units[unit]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label={texts.stock.category}
                value={newFoodCategory}
                onChange={(event) => setNewFoodCategory(event.target.value as FoodCategory)}
              >
                {foodCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {texts.foodCategories[category]}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
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
          <Button type="submit" variant="contained" disabled={!selectedFood || saveMutation.isPending}>
            {texts.common.add}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
