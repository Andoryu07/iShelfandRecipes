import { Alert, Button, DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { deleteShoppingListItem, updateShoppingListItem } from "../api/shoppingListApi";
import type { ShoppingListItem } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { describeError } from "../errorMessages";
import { displayUnits, parseBaseQuantity, quantityText } from "../stock/quantities";
import { QuantityInput } from "../stock/QuantityInput";
import { texts } from "../translations/cs";
import { shoppingListQueryKey } from "./useShoppingList";

interface ShoppingItemSheetProps {
  householdId: number;
  item: ShoppingListItem;
  onClose: () => void;
}

export function ShoppingItemSheet({ householdId, item, onClose }: ShoppingItemSheetProps) {
  const queryClient = useQueryClient();
  const baseUnit = item.food?.baseUnit ?? null;
  const initial = item.quantity !== null && baseUnit ? quantityText(item.quantity, baseUnit) : null;
  const [quantityValue, setQuantityValue] = useState(initial?.text ?? "");
  const [unitSymbol, setUnitSymbol] = useState(
    initial?.unitSymbol ?? (baseUnit ? displayUnits[baseUnit][0].symbol : ""),
  );
  const [note, setNote] = useState(item.note ?? "");
  const [quantityError, setQuantityError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: shoppingListQueryKey(householdId) });
      onClose();
    },
  });

  function save() {
    let quantity: number | null = null;
    if (baseUnit && quantityValue.trim()) {
      quantity = parseBaseQuantity(quantityValue, baseUnit, unitSymbol);
      if (quantity === null) {
        setQuantityError(texts.stock.invalidQuantity);
        return;
      }
    }
    mutation.mutate(() =>
      updateShoppingListItem(item.id, { ...(baseUnit ? { quantity } : {}), note: note.trim() || null }),
    );
  }

  return (
    <BottomSheet open onClose={onClose}>
      <DialogTitle>{item.name}</DialogTitle>
      <DialogContent>
        {baseUnit && (
          <QuantityInput
            label={texts.shoppingList.quantity}
            baseUnit={baseUnit}
            value={quantityValue}
            unitSymbol={unitSymbol}
            onValueChange={setQuantityValue}
            onUnitSymbolChange={setUnitSymbol}
            error={quantityError}
            showCommonQuantities
          />
        )}
        <TextField
          label={texts.shoppingList.note}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          slotProps={{ htmlInput: { maxLength: 200 } }}
        />
        <Stack spacing={1} sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            onClick={() =>
              mutation.mutate(() => updateShoppingListItem(item.id, { isPersonal: !item.isPersonal }))
            }
          >
            {item.isPersonal ? texts.shoppingList.moveToShared : texts.shoppingList.moveToPersonal}
          </Button>
          <Button color="error" onClick={() => mutation.mutate(() => deleteShoppingListItem(item.id))}>
            {texts.shoppingList.remove}
          </Button>
        </Stack>
        {mutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {describeError(mutation.error)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button variant="contained" onClick={save} disabled={mutation.isPending}>
          {texts.common.save}
        </Button>
      </DialogActions>
    </BottomSheet>
  );
}
