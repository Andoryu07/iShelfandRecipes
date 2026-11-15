import {
  Avatar,
  DialogContent,
  DialogTitle,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  ListSubheader,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { listHouseholdCookings } from "../api/recipesApi";
import { BottomSheet } from "../components/BottomSheet";
import { recipeIcon } from "../components/icons";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";
import { groupByDay } from "./cookingDays";

const timeFormat = new Intl.DateTimeFormat("cs-CZ", { hour: "numeric", minute: "2-digit" });

export function HouseholdCookingHistorySheet({
  householdId,
  onClose,
}: {
  householdId: number;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const cookingsQuery = useQuery({
    queryKey: ["households", householdId, "recipes", "cookings"],
    queryFn: () => listHouseholdCookings(householdId),
    staleTime: 0,
  });
  const groups = groupByDay(cookingsQuery.data ?? [], new Date());

  return (
    <BottomSheet open onClose={onClose}>
      <DialogTitle>{texts.history.cookingsTitle}</DialogTitle>
      <DialogContent>
        {cookingsQuery.error && <Typography color="error">{describeError(cookingsQuery.error)}</Typography>}
        {cookingsQuery.isSuccess && groups.length === 0 && (
          <Typography color="text.secondary">{texts.history.householdCookingsEmpty}</Typography>
        )}
        <List dense disablePadding>
          {groups.map((group) => (
            <li key={group.label}>
              <ul style={{ padding: 0 }}>
                <ListSubheader disableGutters sx={{ bgcolor: "background.paper" }}>
                  {group.label}
                </ListSubheader>
                {group.items.map((cooking) => (
                  <ListItemButton
                    key={cooking.id}
                    disabled={cooking.recipeId === null}
                    onClick={() => navigate(`/recipes/${cooking.recipeId}`)}
                    sx={{ borderRadius: 2, px: 1, "&.Mui-disabled": { opacity: 0.75 } }}
                  >
                    <ListItemAvatar>
                      <Avatar variant="rounded" sx={{ bgcolor: "action.hover", borderRadius: 2 }}>
                        {recipeIcon({ icon: cooking.recipeIcon, isPredefined: cooking.recipeIsPredefined })}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        cooking.recipeId === null
                          ? texts.history.deletedRecipe(cooking.recipeName)
                          : cooking.recipeName
                      }
                      secondary={[
                        cooking.userDisplayName ?? texts.stock.unknownUser,
                        texts.recipes.servingCount(cooking.servings),
                        timeFormat.format(new Date(cooking.createdAt)),
                      ].join(" · ")}
                    />
                  </ListItemButton>
                ))}
              </ul>
            </li>
          ))}
        </List>
      </DialogContent>
    </BottomSheet>
  );
}
