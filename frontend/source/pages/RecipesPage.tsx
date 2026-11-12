import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Chip,
  Fab,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { useNavigate } from "react-router";
import { listRecipes } from "../api/recipesApi";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { RecipeEditorDialog } from "../recipes/RecipeEditorDialog";
import { texts } from "../translations/cs";

export function RecipesPage() {
  const { household } = useCurrentHousehold();
  return household ? <RecipeList householdId={household.id} /> : null;
}

function RecipeList({ householdId }: { householdId: number }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const recipesQuery = useQuery({
    queryKey: ["households", householdId, "recipes", deferredSearch],
    queryFn: () => listRecipes(householdId, deferredSearch),
    placeholderData: (previousData) => previousData,
  });

  return (
    <>
      <Typography variant="h5" component="h1">
        {texts.navigation.recipes}
      </Typography>
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
      />
      {recipesQuery.error && <Alert severity="error">{describeError(recipesQuery.error)}</Alert>}
      {recipesQuery.data?.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          {deferredSearch ? texts.recipes.nothingFound : texts.recipes.empty}
        </Typography>
      )}
      <List>
        {recipesQuery.data?.map((recipe) => (
          <ListItemButton key={recipe.id} divider onClick={() => navigate(`/recipes/${recipe.id}`)}>
            <ListItemText
              primary={recipe.name}
              secondary={[
                recipe.preparationMinutes ? texts.recipes.minutes(recipe.preparationMinutes) : null,
                texts.recipes.servingCount(recipe.servings),
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Chip
              size="small"
              color={recipe.missingCount === 0 ? "success" : "warning"}
              label={
                recipe.missingCount === 0
                  ? texts.recipes.haveEverything
                  : texts.recipes.missingCount(recipe.missingCount)
              }
              sx={{ ml: 1 }}
            />
          </ListItemButton>
        ))}
      </List>
      <Fab
        color="primary"
        aria-label={texts.recipes.newRecipe}
        onClick={() => setIsCreating(true)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: "calc(var(--bottom-navigation-height) + var(--safe-area-bottom) + 16px)",
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
