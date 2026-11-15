import {
  Box,
  Button,
  Chip,
  DialogActions,
  DialogContent,
  DialogTitle,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { dishTypes } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { FoodPicker, isNewFood, type FoodChoice } from "../stock/FoodPicker";
import { texts } from "../translations/cs";
import {
  emptyRecipeFilters,
  maximumChosenFoods,
  type RecipeFilterState,
  type RecipeSort,
} from "./recipeFilters";

const sorts: RecipeSort[] = ["name", "missing", "time", "price"];
const anyMissingStep = 5;
const missingMarks = [0, 1, 2, 3, 4, anyMissingStep].map((step) => ({
  value: step,
  label: step === anyMissingStep ? "5+" : String(step),
}));

interface RecipeFiltersSheetProps {
  householdId: number;
  value: RecipeFilterState;
  resultCount: number;
  onChange: (value: RecipeFilterState) => void;
  onClose: () => void;
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
      {children}
    </Typography>
  );
}

export function RecipeFiltersSheet({
  householdId,
  value,
  resultCount,
  onChange,
  onClose,
}: RecipeFiltersSheetProps) {
  const [pickerKey, setPickerKey] = useState(0);
  const isFoodLimitReached = value.foods.length >= maximumChosenFoods;

  function addFood(choice: FoodChoice | null) {
    if (
      !choice ||
      isNewFood(choice) ||
      isFoodLimitReached ||
      value.foods.some((food) => food.id === choice.id)
    ) {
      return;
    }
    onChange({ ...value, foods: [...value.foods, choice] });
    setPickerKey((key) => key + 1);
  }

  return (
    <BottomSheet open onClose={onClose}>
      <DialogTitle>{texts.recipes.filtersTitle}</DialogTitle>
      <DialogContent>
        <SectionTitle>{texts.recipes.maxMissingTitle}</SectionTitle>
        <Typography sx={{ fontWeight: 600 }}>
          {value.maxMissing === null
            ? texts.recipes.maxMissingAny
            : value.maxMissing === 0
              ? texts.recipes.maxMissingNone
              : texts.recipes.maxMissingChip(value.maxMissing)}
        </Typography>
        <Box sx={{ px: 1.5 }}>
          <Slider
            aria-label={texts.recipes.maxMissingTitle}
            min={0}
            max={anyMissingStep}
            step={1}
            marks={missingMarks}
            value={value.maxMissing ?? anyMissingStep}
            onChange={(_, step) => {
              const limit = Array.isArray(step) ? step[0] : step;
              onChange({ ...value, maxMissing: limit >= anyMissingStep ? null : limit });
            }}
            getAriaValueText={(step) => (step >= anyMissingStep ? texts.recipes.maxMissingAny : String(step))}
          />
        </Box>

        <SectionTitle>{texts.recipes.dishTypeTitle}</SectionTitle>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          {dishTypes.map((dishType) => {
            const isSelected = value.dishTypes.includes(dishType);
            return (
              <Chip
                key={dishType}
                label={texts.recipes.dishTypes[dishType]}
                color={isSelected ? "primary" : "default"}
                onClick={() =>
                  onChange({
                    ...value,
                    dishTypes: isSelected
                      ? value.dishTypes.filter((other) => other !== dishType)
                      : [...value.dishTypes, dishType],
                  })
                }
              />
            );
          })}
        </Stack>

        <SectionTitle>{texts.recipes.containsTitle}</SectionTitle>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {isFoodLimitReached
            ? texts.recipes.containsLimit(maximumChosenFoods)
            : texts.recipes.containsHint(maximumChosenFoods)}
        </Typography>
        {value.foods.length > 0 && (
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 1 }}>
            {value.foods.map((food) => (
              <Chip
                key={food.id}
                label={food.name}
                onDelete={() =>
                  onChange({ ...value, foods: value.foods.filter((other) => other.id !== food.id) })
                }
              />
            ))}
          </Stack>
        )}
        {!isFoodLimitReached && (
          <FoodPicker
            key={pickerKey}
            householdId={householdId}
            value={null}
            onChange={addFood}
            allowNewFood={false}
            label={texts.recipes.chooseFood}
          />
        )}

        <SectionTitle>{texts.recipes.sortTitle}</SectionTitle>
        <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
          {sorts.map((sort) => (
            <Chip
              key={sort}
              label={texts.recipes.sortOptions[sort]}
              color={value.sort === sort ? "primary" : "default"}
              onClick={() => onChange({ ...value, sort })}
            />
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {texts.recipes.favouritesStayOnTop}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => onChange({ ...emptyRecipeFilters, quickFilters: value.quickFilters })}>
          {texts.recipes.clearFilters}
        </Button>
        <Button variant="contained" onClick={onClose}>
          {texts.recipes.showResults(resultCount)}
        </Button>
      </DialogActions>
    </BottomSheet>
  );
}
