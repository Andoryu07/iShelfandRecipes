import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditNoteRoundedIcon from "@mui/icons-material/EditNoteRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import TuneRoundedIcon from "@mui/icons-material/TuneRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
  Chip,
  Fab,
  InputAdornment,
  ListItemIcon,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useDeferredValue, useState } from "react";
import { useNavigate } from "react-router";
import { listRecipes } from "../api/recipesApi";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { recipeIcon } from "../components/icons";
import { FavouriteButton } from "../recipes/FavouriteButton";
import { RecipeFiltersSheet } from "../recipes/RecipeFiltersSheet";
import {
  advancedFilterCount,
  applyRecipeFilters,
  emptyRecipeFilters,
  type QuickFilter,
  type RecipeFilterState,
} from "../recipes/recipeFilters";
import { HouseholdCookingHistorySheet } from "../recipes/HouseholdCookingHistorySheet";
import { formatMoney } from "../receipts/money";
import { RecipeEditorDialog } from "../recipes/RecipeEditorDialog";
import { RecipeScanSheet } from "../recipes/RecipeScanSheet";
import { formValuesFromScan, type RecipeFormValues } from "../recipes/recipeForm";
import { AdSlot } from "../ads/AdSlot";
import { texts } from "../translations/cs";

const quickFilters: { value: QuickFilter; label: string }[] = [
  { value: "favourites", label: texts.recipes.filterFavourites },
  { value: "expiring", label: texts.recipes.filterExpiring },
  { value: "quick", label: texts.recipes.filterQuick },
  { value: "vegetarian", label: texts.recipes.filterVegetarian },
  { value: "own", label: texts.recipes.filterOwn },
];

const adPosition = 3;

export function RecipesPage() {
  const { household } = useCurrentHousehold();
  return household ? <RecipeList householdId={household.id} /> : null;
}

function RecipeList({ householdId }: { householdId: number }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterState, setFilterState] = useState<RecipeFilterState>(emptyRecipeFilters);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedValues, setScannedValues] = useState<RecipeFormValues | null>(null);
  const [newRecipeMenuAnchor, setNewRecipeMenuAnchor] = useState<HTMLElement | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const foodIds = filterState.foods.map((food) => food.id);
  const recipesQuery = useQuery({
    queryKey: ["households", householdId, "recipes", deferredSearch, foodIds],
    queryFn: () => listRecipes(householdId, deferredSearch, foodIds),
    placeholderData: (previousData) => previousData,
  });
  const recipes = applyRecipeFilters(recipesQuery.data ?? [], filterState);
  const hiddenFilterCount = advancedFilterCount(filterState);
  const isFiltering =
    filterState.quickFilters.length > 0 || filterState.maxMissing !== null || hiddenFilterCount > 0;

  function toggleQuickFilter(value: QuickFilter) {
    setFilterState((current) => ({
      ...current,
      quickFilters: current.quickFilters.includes(value)
        ? current.quickFilters.filter((filter) => filter !== value)
        : [...current.quickFilters, value],
    }));
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
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 1 }}>
        {quickFilters.slice(0, 1).map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            color={filterState.quickFilters.includes(filter.value) ? "primary" : "default"}
            onClick={() => toggleQuickFilter(filter.value)}
          />
        ))}
        <Chip
          label={texts.recipes.filterCookNow}
          color={filterState.maxMissing === 0 ? "primary" : "default"}
          onClick={() =>
            setFilterState((current) => ({ ...current, maxMissing: current.maxMissing === 0 ? null : 0 }))
          }
        />
        {quickFilters.slice(1).map((filter) => (
          <Chip
            key={filter.value}
            label={filter.label}
            color={filterState.quickFilters.includes(filter.value) ? "primary" : "default"}
            onClick={() => toggleQuickFilter(filter.value)}
          />
        ))}
        <Badge badgeContent={hiddenFilterCount} color="primary">
          <Chip
            icon={<TuneRoundedIcon />}
            label={texts.recipes.moreFilters}
            variant="outlined"
            onClick={() => setIsFiltersOpen(true)}
          />
        </Badge>
      </Stack>
      {hiddenFilterCount > 0 && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", mb: 1 }}>
          {filterState.maxMissing !== null && filterState.maxMissing > 0 && (
            <Chip
              size="small"
              label={texts.recipes.maxMissingChip(filterState.maxMissing)}
              onDelete={() => setFilterState((current) => ({ ...current, maxMissing: null }))}
            />
          )}
          {filterState.dishTypes.map((dishType) => (
            <Chip
              key={dishType}
              size="small"
              label={texts.recipes.dishTypes[dishType]}
              onDelete={() =>
                setFilterState((current) => ({
                  ...current,
                  dishTypes: current.dishTypes.filter((other) => other !== dishType),
                }))
              }
            />
          ))}
          {filterState.foods.map((food) => (
            <Chip
              key={food.id}
              size="small"
              label={food.name}
              onDelete={() =>
                setFilterState((current) => ({
                  ...current,
                  foods: current.foods.filter((other) => other.id !== food.id),
                }))
              }
            />
          ))}
          {filterState.sort !== "name" && (
            <Chip
              size="small"
              label={texts.recipes.sortOptions[filterState.sort]}
              onDelete={() => setFilterState((current) => ({ ...current, sort: "name" }))}
            />
          )}
        </Stack>
      )}
      <Box sx={{ mb: 1 }} />
      {isFiltersOpen && (
        <RecipeFiltersSheet
          householdId={householdId}
          value={filterState}
          resultCount={recipes.length}
          onChange={setFilterState}
          onClose={() => setIsFiltersOpen(false)}
        />
      )}
      {recipesQuery.error && <Alert severity="error">{describeError(recipesQuery.error)}</Alert>}
      {recipesQuery.data && recipes.length === 0 && (
        <Stack sx={{ alignItems: "center", textAlign: "center", mt: 6, gap: 1 }}>
          <Typography sx={{ fontSize: 48 }}>🍳</Typography>
          <Typography color="text.secondary">
            {deferredSearch || isFiltering ? texts.recipes.nothingFound : texts.recipes.empty}
          </Typography>
        </Stack>
      )}
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5 }}>
        {recipes.map((recipe, index) => (
          <Fragment key={recipe.id}>
            {index === adPosition && (
              <Box sx={{ gridColumn: "1 / -1" }}>
                <AdSlot />
              </Box>
            )}
            <Card sx={{ position: "relative" }}>
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
                  <Stack direction="row" sx={{ gap: 0.5, flexWrap: "wrap", mt: 0.75 }}>
                    <Chip
                      size="small"
                      color={recipe.missingCount === 0 ? "success" : "warning"}
                      label={
                        recipe.missingCount === 0
                          ? texts.recipes.haveEverything
                          : texts.recipes.missingCount(recipe.missingCount)
                      }
                    />
                    {(recipe.expiringIngredientCount ?? 0) > 0 && (
                      <Chip
                        size="small"
                        variant="outlined"
                        color="warning"
                        label={`⏳ ${texts.recipes.usesExpiring(recipe.expiringIngredientCount ?? 0)}`}
                      />
                    )}
                    {recipe.isVegetarian && (
                      <Chip size="small" variant="outlined" label={`🌱 ${texts.recipes.vegetarian}`} />
                    )}
                  </Stack>
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
          </Fragment>
        ))}
      </Box>
      <Box sx={{ height: 72 }} />
      <Fab
        color="primary"
        aria-label={texts.recipes.newRecipe}
        onClick={(event) => setNewRecipeMenuAnchor(event.currentTarget)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: { xs: "calc(var(--bottom-navigation-height) + var(--safe-area-bottom) + 16px)", md: 24 },
        }}
      >
        <AddRoundedIcon />
      </Fab>
      <Menu
        anchorEl={newRecipeMenuAnchor}
        open={newRecipeMenuAnchor !== null}
        onClose={() => setNewRecipeMenuAnchor(null)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => {
            setNewRecipeMenuAnchor(null);
            setIsCreating(true);
          }}
        >
          <ListItemIcon>
            <EditNoteRoundedIcon />
          </ListItemIcon>
          {texts.recipes.writeRecipe}
        </MenuItem>
        <MenuItem
          onClick={() => {
            setNewRecipeMenuAnchor(null);
            setIsScanning(true);
          }}
        >
          <ListItemIcon>
            <PhotoCameraRoundedIcon />
          </ListItemIcon>
          {texts.recipes.scanRecipe}
        </MenuItem>
      </Menu>
      {isScanning && (
        <RecipeScanSheet
          householdId={householdId}
          onClose={() => setIsScanning(false)}
          onScanned={(scan) => {
            setIsScanning(false);
            setScannedValues(formValuesFromScan(scan));
          }}
        />
      )}
      {(isCreating || scannedValues) && (
        <RecipeEditorDialog
          householdId={householdId}
          recipe={null}
          initialValues={scannedValues ?? undefined}
          onClose={() => {
            setIsCreating(false);
            setScannedValues(null);
          }}
          onSaved={(saved) => navigate(`/recipes/${saved.id}`)}
        />
      )}
    </>
  );
}
