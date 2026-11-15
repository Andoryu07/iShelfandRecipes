import AddRoundedIcon from "@mui/icons-material/AddRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Fab,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router";
import { listRecipes } from "../api/recipesApi";
import type { RecipeSummary } from "../api/types";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { recipeIcon } from "../components/icons";
import { FavouriteButton } from "../recipes/FavouriteButton";
import { HouseholdCookingHistorySheet } from "../recipes/HouseholdCookingHistorySheet";
import { formatMoney } from "../receipts/money";
import { RecipeEditorDialog } from "../recipes/RecipeEditorDialog";
import { texts } from "../translations/cs";

type RecipeFilter = "favourites" | "cookNow" | "quick" | "own";

const filters: { value: RecipeFilter; label: string; matches: (recipe: RecipeSummary) => boolean }[] = [
  {
    value: "favourites",
    label: texts.recipes.filterFavourites,
    matches: (recipe) => recipe.isFavourite === true,
  },
  { value: "cookNow", label: texts.recipes.filterCookNow, matches: (recipe) => recipe.missingCount === 0 },
  {
    value: "quick",
    label: texts.recipes.filterQuick,
    matches: (recipe) => recipe.preparationMinutes !== null && recipe.preparationMinutes <= 30,
  },
  { value: "own", label: texts.recipes.filterOwn, matches: (recipe) => !recipe.isPredefined },
];

export function RecipesPage() {
  const { household } = useCurrentHousehold();
  return household ? <RecipeList householdId={household.id} /> : null;
}

function RecipeList({ householdId }: { householdId: number }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<RecipeFilter[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const recipesQuery = useQuery({
    queryKey: ["households", householdId, "recipes", deferredSearch],
    queryFn: () => listRecipes(householdId, deferredSearch),
    placeholderData: (previousData) => previousData,
  });
  const recipes = (recipesQuery.data ?? []).filter((recipe) =>
    activeFilters.every((filterValue) =>
      filters.find((filter) => filter.value === filterValue)!.matches(recipe),
    ),
  );

  function toggleFilter(value: RecipeFilter) {
    setActiveFilters((current) =>
      current.includes(value) ? current.filter((filterValue) => filterValue !== value) : [...current, value],
    );
  }

  return (
    <>
      <Stack direction="row" sx={{ gap: 1, alignItems: "center" }}>
        <TextField
          placeholder={texts.recipes.searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRoundedIcon />
                </InputAdornment>
              ),
            },
            htmlInput: { type: "search", maxLength: 100 },
          }}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          startIcon={<HistoryRoundedIcon />}
          onClick={() => setIsHistoryOpen(true)}
          sx={{ flexShrink: 0, mt: 1, height: 40 }}
        >
          {texts.history.openHistory}
        </Button>
      </Stack>
      {isHistoryOpen && (
        <HouseholdCookingHistorySheet householdId={householdId} onClose={() => setIsHistoryOpen(false)} />
      )}
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 2 }}>
        {filters.map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            color={activeFilters.includes(filter.value) ? "primary" : "default"}
            onClick={() => toggleFilter(filter.value)}
          />
        ))}
      </Stack>
      {recipesQuery.error && <Alert severity="error">{describeError(recipesQuery.error)}</Alert>}
      {recipesQuery.data && recipes.length === 0 && (
        <Stack sx={{ alignItems: "center", textAlign: "center", mt: 6, gap: 1 }}>
          <Typography sx={{ fontSize: 48 }}>🍳</Typography>
          <Typography color="text.secondary">
            {deferredSearch || activeFilters.length ? texts.recipes.nothingFound : texts.recipes.empty}
          </Typography>
        </Stack>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        {recipes.map((recipe) => (
          <Card key={recipe.id} sx={{ position: "relative" }}>
            <CardActionArea
              onClick={() => navigate(`/recipes/${recipe.id}`)}
              sx={{ display: "flex", p: 1.5, gap: 1.5 }}
            >
              <Avatar
                variant="rounded"
                sx={{ width: 64, height: 64, fontSize: 32, bgcolor: "action.hover", borderRadius: 3 }}
              >
                {recipeIcon(recipe)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0, pr: 4 }}>
                <Typography sx={{ fontWeight: 650 }} noWrap>
                  {recipe.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {[
                    recipe.preparationMinutes ? texts.recipes.minutes(recipe.preparationMinutes) : null,
                    recipe.estimatedPrice ? `~${formatMoney(recipe.estimatedPrice)}` : null,
                    texts.recipes.servingCount(recipe.servings),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Typography>
                <Chip
                  size="small"
                  color={recipe.missingCount === 0 ? "success" : "warning"}
                  label={
                    recipe.missingCount === 0
                      ? texts.recipes.haveEverything
                      : texts.recipes.missingCount(recipe.missingCount)
                  }
                  sx={{ mt: 0.75 }}
                />
              </Box>
            </CardActionArea>
            <Box sx={{ position: "absolute", top: 4, right: 4 }}>
              <FavouriteButton
                householdId={householdId}
                recipeId={recipe.id}
                isFavourite={recipe.isFavourite === true}
              />
            </Box>
          </Card>
        ))}
      </Box>
      <Box sx={{ height: 72 }} />
      <Fab
        color="primary"
        aria-label={texts.recipes.newRecipe}
        onClick={() => setIsCreating(true)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: { xs: "calc(var(--bottom-navigation-height) + var(--safe-area-bottom) + 16px)", md: 24 },
        }}
      >
        <AddRoundedIcon />
      </Fab>
      {isCreating && (
        <RecipeEditorDialog
          householdId={householdId}
          recipe={null}
          onClose={() => setIsCreating(false)}
          onSaved={(saved) => navigate(`/recipes/${saved.id}`)}
        />
      )}
    </>
  );
}
