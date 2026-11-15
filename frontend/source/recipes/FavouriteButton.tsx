import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import { IconButton } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addFavouriteRecipe, removeFavouriteRecipe } from "../api/recipesApi";
import type { Recipe, RecipeSummary } from "../api/types";
import { texts } from "../translations/cs";

interface FavouriteButtonProps {
  householdId: number;
  recipeId: number;
  isFavourite: boolean;
}

function isRecipeList(data: unknown): data is RecipeSummary[] {
  return (
    Array.isArray(data) &&
    data.every((item) => typeof item === "object" && item !== null && "missingCount" in item)
  );
}

export function FavouriteButton({ householdId, recipeId, isFavourite }: FavouriteButtonProps) {
  const queryClient = useQueryClient();
  const listKey = ["households", householdId, "recipes"];
  const mutation = useMutation({
    mutationFn: (favourite: boolean) =>
      favourite ? addFavouriteRecipe(recipeId) : removeFavouriteRecipe(recipeId),
    onMutate: (favourite) => {
      queryClient.setQueriesData({ queryKey: listKey }, (data: unknown) =>
        isRecipeList(data)
          ? data.map((recipe) => (recipe.id === recipeId ? { ...recipe, isFavourite: favourite } : recipe))
          : data,
      );
      queryClient.setQueryData<Recipe>(["recipes", recipeId], (recipe) =>
        recipe ? { ...recipe, isFavourite: favourite } : recipe,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: listKey }),
  });
  return (
    <IconButton
      aria-label={isFavourite ? texts.recipes.removeFavourite : texts.recipes.addFavourite}
      aria-pressed={isFavourite}
      onClick={(event) => {
        event.stopPropagation();
        mutation.mutate(!isFavourite);
      }}
      sx={{ color: isFavourite ? "warning.main" : "text.secondary" }}
    >
      {isFavourite ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
    </IconButton>
  );
}
