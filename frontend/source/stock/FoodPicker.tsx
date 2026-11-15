import { Autocomplete, Chip, Stack, TextField, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { searchFoods } from "../api/stockApi";
import { foodCategories, type Food, type FoodCategory, type MeasurementUnit } from "../api/types";
import { categoryEmoji } from "../components/CategoryAvatar";
import { texts } from "../translations/cs";
import { suggestFood } from "./foodSuggestions";

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

function labelOf(choice: FoodChoice): string {
  return isNewFood(choice) ? choice.newFoodName : choice.name;
}

const measurementUnits: MeasurementUnit[] = ["gram", "milliliter", "piece"];

interface FoodPickerProps {
  householdId: number;
  value: FoodChoice | null;
  onChange: (choice: FoodChoice | null) => void;
  newFoodDefaults?: Partial<Omit<NewFood, "newFoodName">>;
  autoFocus?: boolean;
  required?: boolean;
  allowNewFood?: boolean;
  label?: string;
}

export function FoodPicker({
  householdId,
  value,
  onChange,
  newFoodDefaults,
  autoFocus,
  required,
  allowNewFood = true,
  label,
}: FoodPickerProps) {
  const [input, setInput] = useState(value ? labelOf(value) : "");
  const searchText = useDeferredValue(input.trim());
  const foodsQuery = useQuery({
    queryKey: ["households", householdId, "foods", searchText],
    queryFn: () => searchFoods(householdId, searchText),
    enabled: searchText.length > 0,
  });
  const foundFoods = foodsQuery.data ?? [];
  const exactMatch = foundFoods.some((food) => food.name.toLowerCase() === searchText.toLowerCase());
  const suggestion = suggestFood(searchText);
  const newFoodOption: NewFood = {
    newFoodName: searchText,
    baseUnit: newFoodDefaults?.baseUnit ?? suggestion?.baseUnit ?? "gram",
    category: newFoodDefaults?.category ?? suggestion?.category ?? "other",
    genericName: newFoodDefaults?.genericName ?? suggestion?.genericName ?? "",
  };
  const options: FoodChoice[] =
    allowNewFood && searchText && !exactMatch ? [...foundFoods, newFoodOption] : foundFoods;

  function chooseTypedFood() {
    if (!searchText) {
      if (value) {
        onChange(null);
      }
      return;
    }
    if (value && labelOf(value).toLowerCase() === searchText.toLowerCase()) {
      return;
    }
    const sameName = foundFoods.find((food) => food.name.toLowerCase() === searchText.toLowerCase());
    if (sameName || allowNewFood) {
      onChange(sameName ?? newFoodOption);
    }
  }

  return (
    <Autocomplete
      options={options}
      value={value}
      inputValue={input}
      onInputChange={(_, text) => setInput(text)}
      onChange={(_, choice) => onChange(choice)}
      onBlur={chooseTypedFood}
      clearOnBlur={false}
      filterOptions={(currentOptions) => currentOptions}
      getOptionLabel={labelOf}
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
        <TextField
          {...parameters}
          label={label ?? texts.stock.food}
          autoFocus={autoFocus}
          required={required}
        />
      )}
    />
  );
}

export function CategoryChips({
  value,
  onChange,
}: {
  value: FoodCategory;
  onChange: (category: FoodCategory) => void;
}) {
  return (
    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
      {foodCategories.map((category) => (
        <Chip
          key={category}
          size="small"
          label={`${categoryEmoji[category]} ${texts.foodCategories[category]}`}
          color={value === category ? "primary" : "default"}
          onClick={() => onChange(category)}
        />
      ))}
    </Stack>
  );
}

export function NewFoodFields({ value, onChange }: { value: NewFood; onChange: (value: NewFood) => void }) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, mb: 1 }}>
        {texts.stock.newFoodHint}
      </Typography>
      <CategoryChips value={value.category} onChange={(category) => onChange({ ...value, category })} />
      <TextField
        label={texts.stock.genericName}
        value={value.genericName}
        onChange={(event) => onChange({ ...value, genericName: event.target.value })}
        helperText={texts.stock.genericNameHint}
        slotProps={{ htmlInput: { maxLength: 100 } }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1 }}>
        {texts.stock.baseUnit}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {measurementUnits.map((unit) => (
          <Chip
            key={unit}
            size="small"
            label={texts.units[unit]}
            color={value.baseUnit === unit ? "primary" : "default"}
            onClick={() => onChange({ ...value, baseUnit: unit })}
          />
        ))}
      </Stack>
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
