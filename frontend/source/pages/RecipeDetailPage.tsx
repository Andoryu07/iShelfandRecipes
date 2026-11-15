import CancelRoundedIcon from "@mui/icons-material/CancelRounded";
import MoreVertRoundedIcon from "@mui/icons-material/MoreVertRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ReportProblemRoundedIcon from "@mui/icons-material/ReportProblemRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  cookRecipe,
  deleteRecipe,
  getRecipe,
  getRecipeAvailability,
  reserveRecipeIngredients,
} from "../api/recipesApi";
import type { IngredientAvailability } from "../api/types";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { recipeIcon } from "../components/icons";
import { LoadingScreen } from "../components/LoadingScreen";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { AddMissingFoodsSheet } from "../recipes/AddMissingFoodsSheet";
import { CookingHistory } from "../recipes/CookingHistory";
import { FavouriteButton } from "../recipes/FavouriteButton";
import { RecipeEditorDialog } from "../recipes/RecipeEditorDialog";
import { useStorageLocations } from "../households/useStorageLocations";
import { formatMoney } from "../receipts/money";
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

const collapsedMissingCount = 5;

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
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isMissingExpanded, setIsMissingExpanded] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [isReservedMessageOpen, setIsReservedMessageOpen] = useState(false);
  const [isCookConfirmationOpen, setIsCookConfirmationOpen] = useState(false);
  const [isCookedMessageOpen, setIsCookedMessageOpen] = useState(false);
  const [isAddingMissing, setIsAddingMissing] = useState(false);
  const storageLocations = useStorageLocations(householdId).data ?? [];
  const recipeQuery = useQuery({ queryKey: ["recipes", recipeId], queryFn: () => getRecipe(recipeId) });
  const recipe = recipeQuery.data;
  const currentServings = servings ?? recipe?.servings ?? 1;
  const availabilityQuery = useQuery({
    queryKey: ["recipes", recipeId, "availability", servings ?? "default"],
    queryFn: () => getRecipeAvailability(recipeId, servings),
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
  const cookMutation = useMutation({
    mutationFn: () => cookRecipe(recipeId, currentServings),
    onSuccess: async () => {
      setIsCookConfirmationOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["recipes", recipeId] }),
        queryClient.invalidateQueries({ queryKey: ["households", householdId, "recipes"] }),
        queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) }),
      ]);
      setIsCookedMessageOpen(true);
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
  const available = required.filter((ingredient) => ingredient.availableQuantity > 0);

  return (
    <>
      <Stack direction="row" sx={{ alignItems: "center", mt: 1, gap: 1.5 }}>
        <Avatar
          variant="rounded"
          sx={{ width: 48, height: 48, fontSize: 26, bgcolor: "action.hover", borderRadius: 3 }}
        >
          {recipeIcon(recipe)}
        </Avatar>
        <Typography variant="h5" component="h2" sx={{ flex: 1 }}>
          {recipe.name}
        </Typography>
        <FavouriteButton
          householdId={householdId}
          recipeId={recipeId}
          isFavourite={recipe.isFavourite === true}
        />
        <IconButton
          aria-label={texts.recipes.moreActions}
          onClick={(event) => setMenuAnchor(event.currentTarget)}
        >
          <MoreVertRoundedIcon />
        </IconButton>
      </Stack>
      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            setIsEditing(true);
          }}
        >
          {texts.recipes.edit}
        </MenuItem>
        <MenuItem
          sx={{ color: "error.main" }}
          onClick={() => {
            setMenuAnchor(null);
            setIsDeleteConfirmationOpen(true);
          }}
        >
          {texts.recipes.delete}
        </MenuItem>
      </Menu>
      {recipe.preparationMinutes && (
        <Typography color="text.secondary">{texts.recipes.minutes(recipe.preparationMinutes)}</Typography>
      )}
      {availabilityQuery.data && (
        <>
          <Typography color="text.secondary">
            {availabilityQuery.data.estimatedPrice !== null
              ? texts.recipes.priceEstimate(
                  formatMoney(availabilityQuery.data.estimatedPrice),
                  formatMoney(availabilityQuery.data.estimatedPrice / availabilityQuery.data.servings),
                )
              : texts.recipes.priceUnknown}
          </Typography>
          {availabilityQuery.data.estimatedPrice !== null &&
            availabilityQuery.data.pricedIngredientCount < availabilityQuery.data.requiredIngredientCount && (
              <Typography variant="body2" color="text.secondary">
                {texts.recipes.pricePartial(
                  availabilityQuery.data.pricedIngredientCount,
                  availabilityQuery.data.requiredIngredientCount,
                )}
              </Typography>
            )}
        </>
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
            {(isMissingExpanded ? missing : missing.slice(0, collapsedMissingCount)).map((ingredient) => (
              <Box key={ingredient.ingredientId} sx={{ mt: 0.75 }}>
                <Typography sx={{ fontWeight: 600 }}>
                  {ingredient.missingQuantity < ingredient.requiredQuantity
                    ? texts.recipes.missingLine(
                        ingredient.food.name,
                        quantityOf(ingredient, ingredient.missingQuantity),
                        quantityOf(ingredient, ingredient.requiredQuantity),
                      )
                    : texts.recipes.missingWhole(
                        ingredient.food.name,
                        quantityOf(ingredient, ingredient.missingQuantity),
                      )}
                </Typography>
                {ingredient.reservedByOthers > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {texts.recipes.reservedByOthersHint(quantityOf(ingredient, ingredient.reservedByOthers))}
                  </Typography>
                )}
              </Box>
            ))}
            {!isMissingExpanded && missing.length > collapsedMissingCount && (
              <Button sx={{ mt: 1, px: 0 }} onClick={() => setIsMissingExpanded(true)}>
                {texts.recipes.moreMissing(missing.length - collapsedMissingCount)}
              </Button>
            )}
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

      {reserveMutation.error && <Alert severity="error">{describeError(reserveMutation.error)}</Alert>}

      <section className="section">
        <Typography variant="h6" component="h2">
          {texts.recipes.ingredientsTitle}
        </Typography>
        <List dense>
          {required.map((ingredient) => (
            <ListItem key={ingredient.ingredientId} disableGutters>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {ingredient.missingQuantity > 0 ? (
                  <CancelRoundedIcon color="warning" />
                ) : (
                  <CheckCircleRoundedIcon color="success" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={`${ingredientLabel(ingredient)} · ${quantityOf(ingredient, ingredient.requiredQuantity)}`}
                secondary={[
                  ingredient.missingQuantity > 0
                    ? texts.recipes.missingShort(quantityOf(ingredient, ingredient.missingQuantity))
                    : texts.recipes.statusHave,
                  ingredient.reservedForRecipe > 0
                    ? texts.recipes.statusReserved(quantityOf(ingredient, ingredient.reservedForRecipe))
                    : null,
                  ingredient.estimatedPrice !== null ? formatMoney(ingredient.estimatedPrice) : null,
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

      <CookingHistory recipeId={recipeId} />

      <Box
        sx={{
          position: "sticky",
          bottom: { xs: "calc(var(--bottom-navigation-height) + var(--safe-area-bottom) + 8px)", md: 16 },
          mt: 3,
          p: 1.5,
          display: "flex",
          gap: 1,
          borderRadius: "16px",
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          boxShadow: 3,
          zIndex: 2,
        }}
      >
        <Button
          variant="outlined"
          size="large"
          sx={{ flex: 1 }}
          onClick={() => reserveMutation.mutate()}
          disabled={reserveMutation.isPending}
        >
          {texts.recipes.reserveShort}
        </Button>
        <Button
          variant="contained"
          size="large"
          color={missing.length ? "warning" : "primary"}
          sx={{ flex: 1.4, whiteSpace: "nowrap" }}
          onClick={() => setIsCookConfirmationOpen(true)}
        >
          {missing.length ? texts.recipes.cookedWithMissing(missing.length) : texts.recipes.cooked}
        </Button>
      </Box>

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
      <Dialog open={isCookConfirmationOpen} onClose={() => setIsCookConfirmationOpen(false)} fullWidth>
        <DialogTitle>{missing.length ? texts.recipes.cookMissingTitle : texts.recipes.cookTitle}</DialogTitle>
        <DialogContent>
          {missing.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              {texts.recipes.cookMissingWarning}
              <List dense disablePadding>
                {missing.map((ingredient) => (
                  <ListItem key={ingredient.ingredientId} disableGutters>
                    <ListItemText
                      primary={texts.recipes.cookLine(
                        ingredient.food.name,
                        texts.recipes.missingShort(quantityOf(ingredient, ingredient.missingQuantity)),
                      )}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
          {available.length > 0 && <Typography>{texts.recipes.cookIntroduction(currentServings)}</Typography>}
          <List dense>
            {available.map((ingredient) => (
              <ListItem key={ingredient.ingredientId} disableGutters>
                <ListItemText
                  primary={texts.recipes.cookLine(
                    ingredient.food.name,
                    quantityOf(
                      ingredient,
                      Math.min(ingredient.requiredQuantity, ingredient.availableQuantity),
                    ),
                  )}
                />
              </ListItem>
            ))}
          </List>
          {cookMutation.error && <Alert severity="error">{describeError(cookMutation.error)}</Alert>}
        </DialogContent>
        {missing.length ? (
          <Stack spacing={1} sx={{ px: 3, pb: 2 }}>
            <Button
              variant="contained"
              color="warning"
              size="large"
              onClick={() => cookMutation.mutate()}
              disabled={cookMutation.isPending}
            >
              {texts.recipes.cookAnyway}
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={() => {
                setIsCookConfirmationOpen(false);
                setIsAddingMissing(true);
              }}
            >
              {texts.recipes.addMissing}
            </Button>
            <Button onClick={() => setIsCookConfirmationOpen(false)}>{texts.common.cancel}</Button>
          </Stack>
        ) : (
          <DialogActions>
            <Button onClick={() => setIsCookConfirmationOpen(false)}>{texts.common.cancel}</Button>
            <Button
              variant="contained"
              onClick={() => cookMutation.mutate()}
              disabled={cookMutation.isPending}
            >
              {texts.recipes.cookConfirm}
            </Button>
          </DialogActions>
        )}
      </Dialog>
      {isAddingMissing && (
        <AddMissingFoodsSheet
          householdId={householdId}
          ingredients={ingredients}
          storageLocations={storageLocations}
          onClose={() => setIsAddingMissing(false)}
          onAdded={async () => {
            await Promise.all([
              queryClient.invalidateQueries({ queryKey: ["recipes", recipeId] }),
              queryClient.invalidateQueries({ queryKey: ["households", householdId, "recipes"] }),
              queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) }),
            ]);
            setIsAddingMissing(false);
            setIsCookConfirmationOpen(true);
          }}
        />
      )}
      <Snackbar
        open={isCookedMessageOpen}
        autoHideDuration={3000}
        onClose={() => setIsCookedMessageOpen(false)}
        message={texts.recipes.cookDone}
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
