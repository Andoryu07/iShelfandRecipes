import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Alert,
  Box,
  Button,
  Collapse,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { updateFood } from "../api/stockApi";
import type { Food, Nutrition } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { describeError } from "../errorMessages";
import { parseDecimal } from "../stock/quantities";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { texts } from "../translations/cs";
import { formatNutritionValue, hasNutrition, nutritionKeys, type NutritionKey } from "./nutrition";
import { NutriscoreBadge } from "./NutriscoreBadge";

function NutritionEditor({
  householdId,
  food,
  onSaved,
  onClose,
}: {
  householdId: number;
  food: Food;
  onSaved: (food: Food) => void;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<NutritionKey, string>>(
    () =>
      Object.fromEntries(
        nutritionKeys.map((key) => [
          key,
          food.nutrition?.[key] != null ? String(food.nutrition[key]).replace(".", ",") : "",
        ]),
      ) as Record<NutritionKey, string>,
  );
  const [pieceWeight, setPieceWeight] = useState(
    food.pieceWeightGrams != null ? String(food.pieceWeightGrams).replace(".", ",") : "",
  );
  const [inputError, setInputError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (changes: { nutrition: Nutrition | null; pieceWeightGrams?: number | null }) =>
      updateFood(food.id, changes),
    onSuccess: async (saved) => {
      await queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) });
      onSaved(saved);
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const nutrition: Nutrition = {};
    for (const key of nutritionKeys) {
      const text = values[key].trim();
      if (!text) {
        continue;
      }
      const value = parseDecimal(text);
      if (value === null || value < 0 || value > 1000) {
        setInputError(texts.nutrition.invalidValue);
        return;
      }
      nutrition[key] = value;
    }
    const weight = pieceWeight.trim() ? parseDecimal(pieceWeight) : null;
    if (pieceWeight.trim() && (weight === null || weight <= 0)) {
      setInputError(texts.nutrition.invalidValue);
      return;
    }
    mutation.mutate({
      nutrition: Object.keys(nutrition).length > 0 ? nutrition : null,
      ...(food.baseUnit === "piece" ? { pieceWeightGrams: weight } : {}),
    });
  }

  return (
    <BottomSheet open onClose={onClose}>
      <form onSubmit={submit} style={{ display: "contents" }}>
        <DialogTitle>{texts.nutrition.editTitle(food.name)}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {texts.nutrition.editHint(food.baseUnit === "milliliter")}
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5 }}>
            {nutritionKeys.map((key) => (
              <TextField
                key={key}
                label={`${texts.nutrition.labels[key]} (${key === "energyKcal" ? "kcal" : "g"})`}
                value={values[key]}
                onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            ))}
          </Box>
          {food.baseUnit === "piece" && (
            <TextField
              label={texts.nutrition.pieceWeight}
              value={pieceWeight}
              onChange={(event) => setPieceWeight(event.target.value)}
              helperText={texts.nutrition.pieceWeightHint}
              slotProps={{ htmlInput: { inputMode: "decimal" } }}
            />
          )}
          {(inputError || mutation.error) && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {inputError ?? describeError(mutation.error)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{texts.common.cancel}</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {texts.common.save}
          </Button>
        </DialogActions>
      </form>
    </BottomSheet>
  );
}

export function NutritionSection({ householdId, food }: { householdId: number; food: Food }) {
  const [currentFood, setCurrentFood] = useState(food);
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const nutrition = currentFood.nutrition;
  const known = hasNutrition(nutrition);
  return (
    <Box sx={{ mt: 1 }}>
      <Button
        variant="outlined"
        size="small"
        onClick={() => setIsOpen(!isOpen)}
        endIcon={isOpen ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
      >
        {known && nutrition.energyKcal != null
          ? texts.nutrition.summary(Math.round(nutrition.energyKcal), currentFood.baseUnit === "milliliter")
          : texts.nutrition.title}
      </Button>
      <Collapse in={isOpen} unmountOnExit>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 1.5 }}>
          <Typography variant="subtitle2" sx={{ flex: 1 }}>
            {texts.nutrition.per100(currentFood.baseUnit === "milliliter")}
          </Typography>
          {currentFood.nutriscoreGrade && <NutriscoreBadge grade={currentFood.nutriscoreGrade} />}
        </Stack>
        {known ? (
          <Table size="small">
            <TableBody>
              {nutritionKeys
                .filter((key) => nutrition[key] != null)
                .map((key) => (
                  <TableRow key={key}>
                    <TableCell sx={{ pl: key === "saturatedFat" || key === "sugars" ? 3 : 0 }}>
                      {texts.nutrition.labels[key]}
                    </TableCell>
                    <TableCell align="right">{formatNutritionValue(key, nutrition[key]!)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {texts.nutrition.empty}
          </Typography>
        )}
        {currentFood.baseUnit === "piece" && currentFood.pieceWeightGrams && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {texts.nutrition.pieceWeightValue(currentFood.pieceWeightGrams)}
          </Typography>
        )}
        <Button size="small" sx={{ mt: 1, px: 0 }} onClick={() => setIsEditing(true)}>
          {known ? texts.nutrition.edit : texts.nutrition.fillIn}
        </Button>
      </Collapse>
      {isEditing && (
        <NutritionEditor
          householdId={householdId}
          food={currentFood}
          onClose={() => setIsEditing(false)}
          onSaved={(saved) => {
            setCurrentFood(saved);
            setIsEditing(false);
          }}
        />
      )}
    </Box>
  );
}
