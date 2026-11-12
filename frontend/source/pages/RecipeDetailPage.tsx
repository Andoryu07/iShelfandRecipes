import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { deleteRecipe, getRecipe, getRecipeAvailability, reserveRecipeIngredients } from "../api/recipesApi";
import type { IngredientAvailability } from "../api/types";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { LoadingScreen } from "../components/LoadingScreen";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { RecipeEditorDialog } from "../recipes/RecipeEditorDialog";
import { formatQuantity } from "../stock/quantities";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { texts } from "../translations/cs";

function quantityOf(ingredient: IngredientAvailability, quantity: number): string {
  return formatQuantity(quantity, ingredient.food.baseUnit);
}

function ingredientLabel(ingredient: IngredientAvailability): string {
  const kind = ingredient.food.genericName;
  return ingredient.acceptsAnyOfKind && kind && kind !== ingredient.food.name
    ? `${ingredient.food.name} (${texts.recipes.anyOfKind(kind)})`
    : ingredient.food.name;
}

export function RecipeDetailPage() {
  const recipeId = Number(useParams().recipeId);
  const { household } = useCurrentHousehold();
  return household ? <RecipeDetail key={recipeId} householdId={household.id} recipeId={recipeId} /> : null;
}

function RecipeDetail({ householdId, recipeId }: { householdId: number; recipeId: number }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [servings, setServings] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isReservedMessageOpen, setIsReservedMessageOpen] = useState(false);
  const recipeQuery = useQuery({ queryKey: ["recipes", recipeId], queryFn: () => getRecipe(recipeId) });
  const recipe = recipeQuery.data;
  const currentServings = servings ?? recipe?.servings ?? 1;
  const availabilityQuery = useQuery({
    queryKey: ["recipes", recipeId, "availability", currentServings],
    queryFn: () => getRecipeAvailability(recipeId, currentServings),
    enabled: recipe !== undefined,
    placeholderData: (previousData) => previousData,
  });
  const reserveMutation = useMutation({
    mutationFn: () => reserveRecipeIngredients(recipeId, currentServings),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recipes", recipeId] }),
        queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) }),
      ]);
      setIsReservedMessageOpen(true);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteRecipe(recipeId),
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: ["households", householdId, "recipes"] });
      queryClient.removeQueries({ queryKey: ["recipes", recipeId] });
      navigate("/recipes", { replace: true });
    },
  });

  if (recipeQuery.error) {
    return <Alert severity="error">{describeError(recipeQuery.error)}</Alert>;
  }
  if (!recipe) {
    return <LoadingScreen />;
  }

  const ingredients = availabilityQuery.data?.ingredients ?? [];
  const missing = ingredients.filter(
    (ingredient) => !ingredient.isOptional && ingredient.missingQuantity > 0,
  );
  const required = ingredients.filter((ingredient) => !ingredient.isOptional);
  const optional = ingredients.filter((ingredient) => ingredient.isOptional);

  return (
    <>
      <Button startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate("/recipes")}>
        {texts.recipes.back}
      </Button>
      <Typography variant="h5" component="h1" sx={{ mt: 1 }}>
        {recipe.name}
      </Typography>
      {recipe.preparationMinutes && (
        <Typography color="text.secondary">{texts.recipes.minutes(recipe.preparationMinutes)}</Typography>
      )}

      {availabilityQuery.data && (
        <Card
          variant="outlined"
          className="section"
          sx={{ borderColor: missing.length ? "warning.main" : "success.main", borderWidth: 2 }}
        >
          <CardContent>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
              {missing.length ? (
                <ReportProblemRoundedIcon color="warning" />
              ) : (
                <CheckCircleRoundedIcon color="success" />
              )}
              <Typography variant="h6" component="h2">
                {missing.length ? texts.recipes.missingTitle : texts.recipes.missingNothing}
              </Typography>
            </Stack>
            {missing.map((ingredient) => (
              <Box key={ingredient.ingredientId} sx={{ mt: 1 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {texts.recipes.missingLine(
                    ingredientLabel(ingredient),
                    quantityOf(ingredient, ingredient.missingQuantity),
                    quantityOf(ingredient, ingredient.requiredQuantity),
                  )}
                </Typography>
                {ingredient.reservedByOthers > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {texts.recipes.reservedByOthersHint(quantityOf(ingredient, ingredient.reservedByOthers))}
                  </Typography>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 2 }}>
        <Typography>{texts.recipes.servings}</Typography>
        <IconButton onClick={() => setServings(Math.max(1, currentServings - 1))} aria-label="−">
          −
        </IconButton>
        <Typography sx={{ minWidth: 24, textAlign: "center", fontWeight: 600 }}>{currentServings}</Typography>
        <IconButton onClick={() => setServings(Math.min(100, currentServings + 1))} aria-label="+">
          +
        </IconButton>
      </Stack>

      <Stack direction="row" spacing={1} useFlexGap sx={{ mt: 1, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          onClick={() => reserveMutation.mutate()}
          disabled={reserveMutation.isPending}
        >
          {texts.recipes.reserveIngredients}
        </Button>
        <Button onClick={() => setIsEditing(true)}>{texts.recipes.edit}</Button>
      </Stack>
      {reserveMutation.error && <Alert severity="error">{describeError(reserveMutation.error)}</Alert>}

      <section className="section">
        <Typography variant="h6" component="h2">
          {texts.recipes.ingredientsTitle}
        </Typography>
        <List dense>
          {required.map((ingredient) => (
            <ListItem key={ingredient.ingredientId} disableGutters>
              <ListItemText
                primary={`${ingredientLabel(ingredient)} · ${quantityOf(ingredient, ingredient.requiredQuantity)}`}
                secondary={[
                  ingredient.missingQuantity > 0
                    ? texts.recipes.missingShort(quantityOf(ingredient, ingredient.missingQuantity))
                    : texts.recipes.statusHave,
                  ingredient.reservedForRecipe > 0
                    ? texts.recipes.statusReserved(quantityOf(ingredient, ingredient.reservedForRecipe))
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
                slotProps={{
                  secondary: { color: ingredient.missingQuantity > 0 ? "warning.dark" : "success.dark" },
                }}
              />
            </ListItem>
          ))}
        </List>
        {optional.length > 0 && (
          <>
            <Typography variant="subtitle1">{texts.recipes.optionalTitle}</Typography>
            <Typography color="text.secondary">
              {optional.map((ingredient) => ingredient.food.name).join(", ")}
            </Typography>
          </>
        )}
      </section>

      {recipe.instructions && (
        <section className="section">
          <Typography variant="h6" component="h2">
            {texts.recipes.instructionsTitle}
          </Typography>
          <Typography sx={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>{recipe.instructions}</Typography>
        </section>
      )}

      <Button color="error" className="section" onClick={() => setIsDeleteConfirmationOpen(true)}>
        {texts.recipes.delete}
      </Button>

      {isEditing && (
        <RecipeEditorDialog
          householdId={householdId}
          recipe={recipe}
          onClose={() => setIsEditing(false)}
          onSaved={() => {
            setIsEditing(false);
            setServings(null);
          }}
        />
      )}
      <ConfirmationDialog
        message={isDeleteConfirmationOpen ? texts.recipes.deleteConfirmation(recipe.name) : null}
        confirmLabel={texts.recipes.delete}
        onConfirm={() => deleteMutation.mutate()}
        onClose={() => setIsDeleteConfirmationOpen(false)}
      />
      <Snackbar
        open={isReservedMessageOpen}
        autoHideDuration={3000}
        onClose={() => setIsReservedMessageOpen(false)}
        message={texts.recipes.reserved}
      />
    </>
  );
}
