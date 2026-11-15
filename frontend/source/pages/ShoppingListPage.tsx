import {
  Alert,
  Box,
  Button,
  Card,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  addShoppingListItem,
  deleteCheckedShoppingListItems,
  deleteShoppingListItem,
  updateShoppingListItem,
} from "../api/shoppingListApi";
import { foodCategories, type FoodCategory, type ShoppingListItem } from "../api/types";
import { categoryEmoji, CategoryAvatar } from "../components/CategoryAvatar";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { useStorageLocations } from "../households/useStorageLocations";
import { ShoppingItemSheet } from "../shopping/ShoppingItemSheet";
import { shoppingListQueryKey, useShoppingList } from "../shopping/useShoppingList";
import { AddFoodsToStockSheet } from "../stock/AddFoodsToStockSheet";
import { FoodPicker, isNewFood, type FoodChoice } from "../stock/FoodPicker";
import { formatQuantity } from "../stock/quantities";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { texts } from "../translations/cs";

type ListKind = "shared" | "personal";
const listKindStorageKey = "iShelf.shoppingListKind";

function storedListKind(): ListKind {
  try {
    return localStorage.getItem(listKindStorageKey) === "personal" ? "personal" : "shared";
  } catch {
    return "shared";
  }
}

export function ShoppingListPage() {
  const { household } = useCurrentHousehold();
  return household ? <ShoppingList householdId={household.id} /> : null;
}

function itemDetails(item: ShoppingListItem): string {
  return [
    item.quantity !== null && item.food ? formatQuantity(item.quantity, item.food.baseUnit) : null,
    item.note,
    item.recipeName ? texts.shoppingList.forRecipe(item.recipeName) : null,
    item.isChecked && item.checkedByDisplayName ? `✓ ${item.checkedByDisplayName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function ShoppingList({ householdId }: { householdId: number }) {
  const queryClient = useQueryClient();
  const [listKind, setListKind] = useState<ListKind>(storedListKind);
  const [pickerKey, setPickerKey] = useState(0);
  const [choice, setChoice] = useState<FoodChoice | null>(null);
  const [editedItem, setEditedItem] = useState<ShoppingListItem | null>(null);
  const [isAddingToStock, setIsAddingToStock] = useState(false);
  const shoppingListQuery = useShoppingList(householdId);
  const storageLocations = useStorageLocations(householdId).data ?? [];
  const queryKey = shoppingListQueryKey(householdId);
  const items = (shoppingListQuery.data ?? []).filter(
    (item) => item.isPersonal === (listKind === "personal"),
  );
  const openItems = items.filter((item) => !item.isChecked);
  const checkedItems = items.filter((item) => item.isChecked);
  const boughtFoods = checkedItems.filter((item) => item.food !== null);

  const groups = foodCategories
    .map((category) => ({
      category,
      items: openItems.filter((item) => ((item.food?.category ?? "other") as FoodCategory) === category),
    }))
    .filter((group) => group.items.length > 0);

  const addMutation = useMutation({
    mutationFn: (selected: FoodChoice) =>
      addShoppingListItem(
        householdId,
        isNewFood(selected)
          ? { name: selected.newFoodName, isPersonal: listKind === "personal" }
          : { foodId: selected.id, isPersonal: listKind === "personal" },
      ),
    onSuccess: async () => {
      setChoice(null);
      setPickerKey((key) => key + 1);
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const changeMutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  });

  function changeListKind(kind: ListKind) {
    setListKind(kind);
    try {
      localStorage.setItem(listKindStorageKey, kind);
    } catch {
      // Remembering the tab is only a convenience.
    }
  }

  function toggleChecked(item: ShoppingListItem) {
    queryClient.setQueryData<ShoppingListItem[]>(queryKey, (current) =>
      current?.map((other) => (other.id === item.id ? { ...other, isChecked: !item.isChecked } : other)),
    );
    changeMutation.mutate(() => updateShoppingListItem(item.id, { isChecked: !item.isChecked }));
  }

  function renderItem(item: ShoppingListItem) {
    return (
      <ListItem
        key={item.id}
        disablePadding
        secondaryAction={
          <Checkbox
            edge="end"
            checked={item.isChecked}
            onChange={() => toggleChecked(item)}
            slotProps={{ input: { "aria-label": item.name } }}
          />
        }
      >
        <ListItemButton onClick={() => setEditedItem(item)} sx={{ pr: 7 }}>
          <ListItemIcon sx={{ minWidth: 48 }}>
            {item.food ? (
              <CategoryAvatar
                category={item.food.category}
                genericName={item.food.genericName}
                icon={item.food.icon}
                size={36}
              />
            ) : (
              <CategoryAvatar category="other" size={36} />
            )}
          </ListItemIcon>
          <ListItemText
            primary={item.name}
            secondary={itemDetails(item) || null}
            slotProps={{
              primary: {
                sx: item.isChecked ? { textDecoration: "line-through", color: "text.secondary" } : {},
              },
            }}
          />
        </ListItemButton>
      </ListItem>
    );
  }

  return (
    <>
      <ToggleButtonGroup
        exclusive
        fullWidth
        size="small"
        value={listKind}
        onChange={(_, value: ListKind | null) => value && changeListKind(value)}
        sx={{ mt: 1 }}
      >
        <ToggleButton value="shared">{texts.shoppingList.shared}</ToggleButton>
        <ToggleButton value="personal">{texts.shoppingList.personal}</ToggleButton>
      </ToggleButtonGroup>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {listKind === "shared" ? texts.shoppingList.sharedHint : texts.shoppingList.personalHint}
      </Typography>

      <Stack direction="row" sx={{ gap: 1, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1 }}>
          <FoodPicker
            key={pickerKey}
            householdId={householdId}
            value={choice}
            onChange={setChoice}
            label={texts.shoppingList.addPlaceholder}
          />
        </Box>
        <Button
          variant="contained"
          disabled={!choice || addMutation.isPending}
          onClick={() => choice && addMutation.mutate(choice)}
          sx={{ mt: 2, height: 56, flexShrink: 0 }}
        >
          {texts.shoppingList.add}
        </Button>
      </Stack>
      {(addMutation.error || shoppingListQuery.error) && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {describeError(addMutation.error ?? shoppingListQuery.error)}
        </Alert>
      )}

      {shoppingListQuery.isSuccess && items.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 3, textAlign: "center" }}>
          {texts.shoppingList.empty}
        </Typography>
      )}

      {groups.map((group) => (
        <section key={group.category}>
          <Typography className="listSectionTitle" component="h2">
            {`${categoryEmoji[group.category]} ${texts.foodCategories[group.category]}`}
          </Typography>
          <Card>
            <List disablePadding>{group.items.map(renderItem)}</List>
          </Card>
        </section>
      ))}

      {checkedItems.length > 0 && (
        <section>
          <Typography className="listSectionTitle" component="h2">
            {texts.shoppingList.inCart(checkedItems.length)}
          </Typography>
          <Card>
            <List disablePadding>{checkedItems.map(renderItem)}</List>
          </Card>
          <Stack spacing={1} sx={{ mt: 2 }}>
            {boughtFoods.length > 0 && (
              <Button variant="contained" size="large" onClick={() => setIsAddingToStock(true)}>
                {texts.shoppingList.addBoughtToStock(boughtFoods.length)}
              </Button>
            )}
            <Button
              color="error"
              onClick={() => changeMutation.mutate(() => deleteCheckedShoppingListItems(householdId))}
            >
              {texts.shoppingList.clearChecked}
            </Button>
          </Stack>
        </section>
      )}

      {editedItem && (
        <ShoppingItemSheet householdId={householdId} item={editedItem} onClose={() => setEditedItem(null)} />
      )}
      {isAddingToStock && (
        <AddFoodsToStockSheet
          householdId={householdId}
          items={boughtFoods.map((item) => ({ key: item.id, food: item.food!, quantity: item.quantity }))}
          title={texts.shoppingList.addBoughtTitle}
          hint={texts.shoppingList.addBoughtHint}
          storageLocations={storageLocations}
          onClose={() => setIsAddingToStock(false)}
          onAdded={async (addedKeys) => {
            await Promise.all(addedKeys.map((itemId) => deleteShoppingListItem(itemId)));
            await Promise.all([
              queryClient.invalidateQueries({ queryKey }),
              queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) }),
            ]);
            setIsAddingToStock(false);
          }}
        />
      )}
    </>
  );
}
