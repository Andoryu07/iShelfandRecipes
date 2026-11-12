import { Autocomplete, MenuItem, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { searchFoods } from "../api/stockApi";
import { foodCategories, type Food, type FoodCategory, type MeasurementUnit } from "../api/types";
import { texts } from "../translations/cs";

export interface NewFood {
  newFoodName: string;
  baseUnit: MeasurementUnit;
  category: FoodCategory;
  genericName: string;
}

export type FoodChoice = Food | NewFood;

export function isNewFood(choice: FoodChoice | null): choice is NewFood {
  return choice !== null && "newFoodName" in choice;
}

export function baseUnitOf(choice: FoodChoice | null): MeasurementUnit | null {
  return choice?.baseUnit ?? null;
}

const measurementUnits: MeasurementUnit[] = ["gram", "milliliter", "piece"];

interface FoodPickerProps {
  householdId: number;
  value: FoodChoice | null;
  onChange: (choice: FoodChoice | null) => void;
  newFoodDefaults?: Partial<Omit<NewFood, "newFoodName">>;
  autoFocus?: boolean;
  required?: boolean;
}

export function FoodPicker({
  householdId,
  value,
  onChange,
  newFoodDefaults,
  autoFocus,
  required,
}: FoodPickerProps) {
  const [input, setInput] = useState(value ? (isNewFood(value) ? value.newFoodName : value.name) : "");
  const searchText = useDeferredValue(input.trim());
  const foodsQuery = useQuery({
    queryKey: ["households", householdId, "foods", searchText],
    queryFn: () => searchFoods(householdId, searchText),
    enabled: searchText.length > 0,
  });
  const foundFoods = foodsQuery.data ?? [];
  const exactMatch = foundFoods.some((food) => food.name.toLowerCase() === searchText.toLowerCase());
  const newFoodOption: NewFood = {
    newFoodName: searchText,
    baseUnit: newFoodDefaults?.baseUnit ?? "gram",
    category: newFoodDefaults?.category ?? "other",
    genericName: newFoodDefaults?.genericName ?? "",
  };
  const options: FoodChoice[] = searchText && !exactMatch ? [...foundFoods, newFoodOption] : foundFoods;

  return (
    <Autocomplete
      options={options}
      value={value}
      inputValue={input}
      onInputChange={(_, text) => setInput(text)}
      onChange={(_, choice) => onChange(choice)}
      filterOptions={(currentOptions) => currentOptions}
      getOptionLabel={(option) => (isNewFood(option) ? option.newFoodName : option.name)}
      getOptionKey={(option) => (isNewFood(option) ? "new" : option.id)}
      isOptionEqualToValue={(option, selected) =>
        isNewFood(option) || isNewFood(selected) ? option === selected : option.id === selected.id
      }
      renderOption={(properties, option) => {
        const { key, ...otherProperties } = properties;
        return (
          <li key={key} {...otherProperties}>
            {isNewFood(option) ? texts.stock.createFoodOption(option.newFoodName) : option.name}
          </li>
        );
      }}
      noOptionsText={searchText ? texts.common.loading : texts.stock.startTyping}
      renderInput={(parameters) => (
        <TextField {...parameters} label={texts.stock.food} autoFocus={autoFocus} required={required} />
      )}
    />
  );
}

export function NewFoodFields({ value, onChange }: { value: NewFood; onChange: (value: NewFood) => void }) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {texts.stock.newFoodHint}
      </Typography>
      <TextField
        select
        label={texts.stock.baseUnit}
        value={value.baseUnit}
        onChange={(event) => onChange({ ...value, baseUnit: event.target.value as MeasurementUnit })}
      >
        {measurementUnits.map((unit) => (
          <MenuItem key={unit} value={unit}>
            {texts.units[unit]}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label={texts.stock.genericName}
        value={value.genericName}
        onChange={(event) => onChange({ ...value, genericName: event.target.value })}
        helperText={texts.stock.genericNameHint}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <TextField
        select
        label={texts.stock.category}
        value={value.category}
        onChange={(event) => onChange({ ...value, category: event.target.value as FoodCategory })}
      >
        {foodCategories.map((category) => (
          <MenuItem key={category} value={category}>
            {texts.foodCategories[category]}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
}

export function newFoodRequest(choice: NewFood) {
  return {
    name: choice.newFoodName,
    genericName: choice.genericName.trim() || null,
    category: choice.category,
    baseUnit: choice.baseUnit,
  };
}
