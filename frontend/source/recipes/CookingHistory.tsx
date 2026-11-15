import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import { Button, Collapse, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listRecipeCookings } from "../api/recipesApi";
import { formatTimestamp, texts } from "../translations/cs";

export function CookingHistory({ recipeId }: { recipeId: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const cookingsQuery = useQuery({
    queryKey: ["recipes", recipeId, "cookings"],
    queryFn: () => listRecipeCookings(recipeId),
    enabled: isOpen,
  });
  const cookings = cookingsQuery.data ?? [];
  return (
    <section>
      <Button
        variant="outlined"
        startIcon={<HistoryRoundedIcon />}
        endIcon={isOpen ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
        onClick={() => setIsOpen(!isOpen)}
        sx={{ mt: 2 }}
      >
        {texts.history.cookingsTitle}
      </Button>
      <Collapse in={isOpen}>
        {cookingsQuery.isSuccess && cookings.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {texts.history.cookingsEmpty}
          </Typography>
        )}
        <List dense>
          {cookings.map((cooking) => (
            <ListItem key={cooking.id} disableGutters>
              <ListItemText
                primary={texts.history.cookingLine(
                  cooking.userDisplayName ?? texts.stock.unknownUser,
                  texts.recipes.servingCount(cooking.servings),
                )}
                secondary={formatTimestamp(cooking.createdAt)}
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </section>
  );
}
