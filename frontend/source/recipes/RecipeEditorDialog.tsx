import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createRecipe, updateRecipe } from "../api/recipesApi";
import type { Recipe } from "../api/types";
import { describeError } from "../errorMessages";
import { baseUnitOf, FoodPicker, isNewFood, NewFoodFields, type FoodChoice } from "../stock/FoodPicker";
import { displayUnits } from "../stock/quantities";
import { QuantityInput } from "../stock/QuantityInput";
import { texts } from "../translations/cs";
import {
  buildRecipeRequest,
  emptyIngredientRow,
  formValuesFromRecipe,
  type IngredientRow,
} from "./recipeForm";

interface RecipeEditorDialogProps {
  householdId: number;
  recipe: Recipe | null;
  onClose: () => void;
  onSaved: (recipe: Recipe) => void;
}

export function RecipeEditorDialog({ householdId, recipe, onClose, onSaved }: RecipeEditorDialogProps) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState(() => formValuesFromRecipe(recipe));
  const [formError, setFormError] = useState<string | null>(null);
  const saveMutation = useMutation({
    mutationFn: (request: NonNullable<ReturnType<typeof buildRecipeRequest>["request"]>) =>
      recipe ? updateRecipe(recipe.id, request) : createRecipe(householdId, request),
    onSuccess: async (saved) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["households", householdId, "recipes"] }),
        queryClient.invalidateQueries({ queryKey: ["recipes", saved.id] }),
        queryClient.invalidateQueries({ queryKey: ["households", householdId, "foods"] }),
      ]);
      onSaved(saved);
    },
  });

  function updateRow(updated: IngredientRow) {
    setValues((current) => ({
      ...current,
      ingredients: current.ingredients.map((row) => (row.key === updated.key ? updated : row)),
    }));
  }

  function changeFood(row: IngredientRow, food: FoodChoice | null) {
    const newBaseUnit = baseUnitOf(food);
    const unitChanged = newBaseUnit !== baseUnitOf(row.food);
    updateRow({
      ...row,
      food,
      unitSymbol: unitChanged && newBaseUnit ? displayUnits[newBaseUnit][0].symbol : row.unitSymbol,
      quantityText: unitChanged ? "" : row.quantityText,
    });
  }

  function submit() {
    const { request, error } = buildRecipeRequest(values);
    setFormError(error);
    if (request) {
      saveMutation.mutate(request);
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth fullScreen={window.innerWidth < 600}>
      <DialogTitle>{recipe ? texts.recipes.editRecipe : texts.recipes.newRecipe}</DialogTitle>
      <DialogContent>
        <TextField
          label={texts.recipes.name}
          value={values.name}
          onChange={(event) => setValues({ ...values, name: event.target.value })}
          slotProps={{ htmlInput: { maxLength: 100 } }}
          required
        />
        <Stack direction="row" spacing={1} useFlexGap>
          <TextField
            label={texts.recipes.servings}
            value={values.servingsText}
            onChange={(event) => setValues({ ...values, servingsText: event.target.value })}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
          <TextField
            label={texts.recipes.preparationMinutes}
            value={values.preparationMinutesText}
            onChange={(event) => setValues({ ...values, preparationMinutesText: event.target.value })}
            slotProps={{ htmlInput: { inputMode: "numeric" } }}
          />
        </Stack>

        <Typography variant="h6" sx={{ mt: 2 }}>
          {texts.recipes.ingredientsTitle}
        </Typography>
        {values.ingredients.map((row) => {
          const baseUnit = baseUnitOf(row.food);
          return (
            <Stack key={row.key} sx={{ mt: 1 }}>
              <Divider />
              <Stack direction="row" sx={{ alignItems: "flex-start", gap: 1 }}>
                <Stack sx={{ flex: 1 }}>
                  <FoodPicker
                    householdId={householdId}
                    value={row.food}
                    onChange={(food) => changeFood(row, food)}
                  />
                </Stack>
                <IconButton
                  aria-label={texts.recipes.removeIngredient}
                  sx={{ mt: 3 }}
                  onClick={() =>
                    setValues({
                      ...values,
                      ingredients: values.ingredients.filter((other) => other.key !== row.key),
                    })
                  }
                >
                  <DeleteOutlineRoundedIcon />
                </IconButton>
              </Stack>
              {isNewFood(row.food) && (
                <NewFoodFields value={row.food} onChange={(food) => changeFood(row, food)} />
              )}
              {baseUnit && (
                <QuantityInput
                  label={texts.stock.quantity}
                  baseUnit={baseUnit}
                  value={row.quantityText}
                  unitSymbol={row.unitSymbol}
                  onValueChange={(quantityText) => updateRow({ ...row, quantityText })}
                  onUnitSymbolChange={(unitSymbol) => updateRow({ ...row, unitSymbol })}
                />
              )}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={row.acceptsAnyOfKind}
                    onChange={(event) => updateRow({ ...row, acceptsAnyOfKind: event.target.checked })}
                  />
                }
                label={texts.recipes.acceptsAnyOfKind}
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={row.isOptional}
                    onChange={(event) => updateRow({ ...row, isOptional: event.target.checked })}
                  />
                }
                label={texts.recipes.isOptional}
              />
            </Stack>
          );
        })}
        <Button
          startIcon={<AddRoundedIcon />}
          onClick={() => setValues({ ...values, ingredients: [...values.ingredients, emptyIngredientRow()] })}
        >
          {texts.recipes.addIngredient}
        </Button>

        <TextField
          label={texts.recipes.instructions}
          value={values.instructions}
          onChange={(event) => setValues({ ...values, instructions: event.target.value })}
          multiline
          minRows={5}
        />
        {formError && <Alert severity="error">{formError}</Alert>}
        {saveMutation.error && <Alert severity="error">{describeError(saveMutation.error)}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button variant="contained" onClick={submit} disabled={saveMutation.isPending}>
          {texts.common.save}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
