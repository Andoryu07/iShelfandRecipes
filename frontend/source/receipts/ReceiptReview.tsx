import AddRoundedIcon from "@mui/icons-material/AddRounded";
import { Alert, Button, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { saveReceipt } from "../api/receiptsApi";
import type { ScannedReceipt, StorageLocation } from "../api/types";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { describeError } from "../errorMessages";
import { localDateText } from "../stock/expiration";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { displayStorageLocationName, texts } from "../translations/cs";
import { formatMoney, moneyText, parseMoney, sumMoney } from "./money";
import {
  buildSaveItems,
  createManualItem,
  createReviewItem,
  itemPrice,
  type ReviewItem,
} from "./reviewItems";
import { ReviewItemCard } from "./ReviewItemCard";

interface ReceiptReviewProps {
  householdId: number;
  scannedReceipt: ScannedReceipt;
  storageLocations: StorageLocation[];
  onFinished: (saved: boolean) => void;
}

export function ReceiptReview({
  householdId,
  scannedReceipt,
  storageLocations,
  onFinished,
}: ReceiptReviewProps) {
  const queryClient = useQueryClient();
  const initialStorageLocationId = storageLocations[0]?.id ?? null;
  const [storeName, setStoreName] = useState(scannedReceipt.storeName ?? "");
  const [purchasedOn, setPurchasedOn] = useState(scannedReceipt.purchasedOn ?? localDateText(new Date()));
  const [totalText, setTotalText] = useState(
    moneyText(scannedReceipt.totalAmount ?? scannedReceipt.itemsSum),
  );
  const [defaultStorageLocationId, setDefaultStorageLocationId] = useState(initialStorageLocationId);
  const [items, setItems] = useState<ReviewItem[]>(() =>
    scannedReceipt.items.map((item) => createReviewItem(item, initialStorageLocationId)),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDiscardConfirmationOpen, setIsDiscardConfirmationOpen] = useState(false);

  const total = parseMoney(totalText);
  const itemsSum = sumMoney(items.map((item) => itemPrice(item) ?? 0));
  const difference = total === null ? null : sumMoney([itemsSum, -total]);
  const sumMatches = difference !== null && Math.abs(difference) <= 1;

  const saveMutation = useMutation({
    mutationFn: (saveItems: ReturnType<typeof buildSaveItems>["items"]) =>
      saveReceipt(householdId, {
        storeName: storeName.trim() || null,
        purchasedOn,
        totalAmount: total!,
        processingMilliseconds: scannedReceipt.processingMilliseconds,
        items: saveItems,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) }),
        queryClient.invalidateQueries({ queryKey: ["households", householdId, "receipts"] }),
        queryClient.invalidateQueries({ queryKey: ["households", householdId, "foods"] }),
      ]);
      onFinished(true);
    },
  });

  function changeDefaultStorageLocation(storageLocationId: number) {
    setDefaultStorageLocationId(storageLocationId);
    setItems((current) => current.map((item) => ({ ...item, storageLocationId })));
  }

  function updateItem(updated: ReviewItem) {
    setItems((current) => current.map((item) => (item.key === updated.key ? updated : item)));
  }

  function submit() {
    const result = buildSaveItems(items);
    setErrors(result.errors);
    if (Object.keys(result.errors).length > 0 || total === null || items.length === 0 || !purchasedOn) {
      return;
    }
    saveMutation.mutate(result.items);
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <>
      <Typography variant="h5" component="h1">
        {texts.receipts.reviewTitle}
      </Typography>
      <TextField
        label={texts.receipts.storeName}
        value={storeName}
        onChange={(event) => setStoreName(event.target.value)}
      />
      <Stack direction="row" spacing={1} useFlexGap>
        <TextField
          type="date"
          label={texts.receipts.purchasedOn}
          value={purchasedOn}
          onChange={(event) => setPurchasedOn(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label={texts.receipts.totalAmount}
          value={totalText}
          onChange={(event) => setTotalText(event.target.value)}
          error={total === null}
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
        />
      </Stack>
      <Alert severity={sumMatches ? "success" : "warning"} sx={{ mt: 1 }}>
        {sumMatches
          ? texts.receipts.sumMatches
          : texts.receipts.sumDiffers(formatMoney(Math.abs(difference ?? itemsSum)))}
      </Alert>
      <TextField
        select
        label={texts.receipts.defaultStorageLocation}
        value={defaultStorageLocationId ?? ""}
        onChange={(event) => changeDefaultStorageLocation(Number(event.target.value))}
      >
        {storageLocations.map((storageLocation) => (
          <MenuItem key={storageLocation.id} value={storageLocation.id}>
            {displayStorageLocationName(storageLocation)}
          </MenuItem>
        ))}
      </TextField>

      {items.map((item) => (
        <ReviewItemCard
          key={item.key}
          householdId={householdId}
          item={item}
          storageLocations={storageLocations}
          error={errors[item.key]}
          onChange={updateItem}
          onRemove={() => setItems((current) => current.filter((other) => other.key !== item.key))}
        />
      ))}
      <Button
        startIcon={<AddRoundedIcon />}
        sx={{ mt: 1 }}
        onClick={() => setItems((current) => [...current, createManualItem(defaultStorageLocationId)])}
      >
        {texts.receipts.addItem}
      </Button>

      {hasErrors && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {texts.receipts.fixItems}
        </Alert>
      )}
      {saveMutation.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {describeError(saveMutation.error)}
        </Alert>
      )}
      <Stack direction="row" spacing={1} sx={{ mt: 3 }}>
        <Button color="error" onClick={() => setIsDiscardConfirmationOpen(true)}>
          {texts.receipts.discard}
        </Button>
        <Button
          variant="contained"
          sx={{ flex: 1 }}
          onClick={submit}
          disabled={saveMutation.isPending || total === null || items.length === 0}
        >
          {texts.receipts.save}
        </Button>
      </Stack>
      <ConfirmationDialog
        message={isDiscardConfirmationOpen ? texts.receipts.discardConfirmation : null}
        confirmLabel={texts.receipts.discard}
        onConfirm={() => onFinished(false)}
        onClose={() => setIsDiscardConfirmationOpen(false)}
      />
    </>
  );
}
