import { Typography } from "@mui/material";
import type { RecipeAvailability } from "../api/types";
import { formatNutritionValue, recipeNutrition } from "../foods/nutrition";
import { texts } from "../translations/cs";

export function RecipeNutritionSummary({ availability }: { availability: RecipeAvailability }) {
  const nutrition = recipeNutrition(availability.ingredients, availability.servings);
  if (nutrition.ingredientCount === 0) {
    return null;
  }
  if (nutrition.knownCount === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        {texts.nutrition.recipeUnknown}
      </Typography>
    );
  }
  const { perServing } = nutrition;
  return (
    <>
      <Typography color="text.secondary">
        {texts.nutrition.recipeTitle}:{" "}
        <strong>{texts.nutrition.recipeKcal(Math.round(perServing.energyKcal))}</strong> ·{" "}
        {texts.nutrition.recipeMacros(
          formatNutritionValue("proteins", perServing.proteins),
          formatNutritionValue("fat", perServing.fat),
          formatNutritionValue("carbohydrates", perServing.carbohydrates),
        )}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {texts.nutrition.recipeKnown(nutrition.knownCount, nutrition.ingredientCount)}
        {nutrition.hasFryingFat ? ` ${texts.nutrition.fryingNote}` : ""}
      </Typography>
    </>
  );
}
