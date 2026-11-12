import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { correctStockQuantity, listStockMovements, updateStockItem, writeOffStock } from "../api/stockApi";
import type { StockItem, StorageLocation } from "../api/types";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, formatDate, formatTimestamp, texts } from "../translations/cs";
import {
  bestDisplayUnit,
  findDisplayUnit,
  formatQuantity,
  parseBaseQuantity,
  parseDecimal,
  toBaseQuantity,
} from "./quantities";
import { QuantityInput } from "./QuantityInput";
import { stockItemsQueryKey, stockMovementsQueryKey } from "./stockQueries";

type WriteOffReason = "eaten" | "spoiled" | "destroyed";
const writeOffReasons: WriteOffReason[] = ["eaten", "spoiled", "destroyed"];

interface StockItemDialogProps {
  householdId: number;
  stockItem: StockItem;
  storageLocations: StorageLocation[];
  onClose: () => void;
}

export function StockItemDialog({ householdId, stockItem, storageLocations, onClose }: StockItemDialogProps) {
  const queryClient = useQueryClient();
  const { food } = stockItem;
  const defaultUnitSymbol = bestDisplayUnit(stockItem.quantity, food.baseUnit).symbol;
  const [mode, setMode] = useState<"overview" | "writeOff" | "edit">("overview");
  const [quantityText, setQuantityText] = useState("");
  const [unitSymbol, setUnitSymbol] = useState(defaultUnitSymbol);
  const [writeOffReason, setWriteOffReason] = useState<WriteOffReason>("eaten");
  const [storageLocationId, setStorageLocationId] = useState(stockItem.storageLocationId);
  const [expirationDate, setExpirationDate] = useState(stockItem.expirationDate ?? "");
  const [correctionText, setCorrectionText] = useState("");
  const [correctionUnitSymbol, setCorrectionUnitSymbol] = useState(defaultUnitSymbol);
  const [inputError, setInputError] = useState<string | null>(null);

  const movementsQuery = useQuery({
    queryKey: stockMovementsQueryKey(householdId, stockItem.id),
    queryFn: () => listStockMovements(stockItem.id),
  });
  const actionMutation = useMutation({
    mutationFn: (action: () => Promise<unknown>) => action(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: stockItemsQueryKey(householdId) });
      onClose();
    },
  });

  function run(action: () => Promise<unknown>) {
    setInputError(null);
    actionMutation.mutate(action);
  }

  function submitWriteOff() {
    const baseQuantity = parseBaseQuantity(quantityText, food.baseUnit, unitSymbol);
    if (baseQuantity === null) {
      setInputError(texts.stock.invalidQuantity);
      return;
    }
    run(() => writeOffStock(stockItem.id, writeOffReason, baseQuantity));
  }

  function submitEdit() {
    const changes: { storageLocationId?: number; expirationDate?: string | null } = {};
    if (storageLocationId !== stockItem.storageLocationId) {
      changes.storageLocationId = storageLocationId;
    }
    if ((expirationDate || null) !== stockItem.expirationDate) {
      changes.expirationDate = expirationDate || null;
    }
    let correctedQuantity: number | null = null;
    if (correctionText.trim()) {
      const value = parseDecimal(correctionText);
      if (value === null) {
        setInputError(texts.stock.invalidQuantity);
        return;
      }
      correctedQuantity = toBaseQuantity(value, findDisplayUnit(food.baseUnit, correctionUnitSymbol));
    }
    run(async () => {
      if (Object.keys(changes).length > 0) {
        await updateStockItem(stockItem.id, changes);
      }
      if (correctedQuantity !== null && correctedQuantity !== stockItem.quantity) {
        await correctStockQuantity(stockItem.id, correctedQuantity);
      }
    });
  }

  const storageLocation = storageLocations.find((location) => location.id === stockItem.storageLocationId);
  const errorMessage =
    inputError ??
    (actionMutation.error ? describeError(actionMutation.error, { 409: texts.stock.moreThanRemains }) : null);

  return (
    <Dialog open onClose={onClose} fullWidth>
      <DialogTitle>{food.name}</DialogTitle>
      <DialogContent>
        <Typography variant="h6">{formatQuantity(stockItem.quantity, food.baseUnit)}</Typography>
        <Typography color="text.secondary">
          {[
            storageLocation ? displayStorageLocationName(storageLocation) : null,
            stockItem.expirationDate
              ? texts.stock.expiresOn(formatDate(stockItem.expirationDate))
              : texts.stock.noExpirationDate,
            texts.foodCategories[food.category],
          ]
            .filter(Boolean)
            .join(" · ")}
        </Typography>
        {stockItem.reservedQuantity > 0 && (
          <Typography color="text.secondary">
            {texts.stock.reserved(formatQuantity(stockItem.reservedQuantity, food.baseUnit))}
          </Typography>
        )}

        {mode === "overview" && (
          <Stack spacing={1} sx={{ mt: 2 }}>
            <Button
              variant="contained"
              disabled={actionMutation.isPending}
              onClick={() => run(() => writeOffStock(stockItem.id, "eaten", stockItem.quantity))}
            >
              {texts.stock.eatenAll}
            </Button>
            <Button
              variant="outlined"
              color="warning"
              disabled={actionMutation.isPending}
              onClick={() => run(() => writeOffStock(stockItem.id, "spoiled", stockItem.quantity))}
            >
              {texts.stock.spoiledAll}
            </Button>
            <Stack direction="row" spacing={1} useFlexGap>
              <Button sx={{ flex: 1 }} onClick={() => setMode("writeOff")}>
                {texts.stock.writeOffPart}
              </Button>
              <Button sx={{ flex: 1 }} onClick={() => setMode("edit")}>
                {texts.stock.editTitle}
              </Button>
            </Stack>
          </Stack>
        )}

        {mode === "writeOff" && (
          <>
            <QuantityInput
              label={texts.stock.quantity}
              baseUnit={food.baseUnit}
              value={quantityText}
              unitSymbol={unitSymbol}
              onValueChange={setQuantityText}
              onUnitSymbolChange={setUnitSymbol}
              autoFocus
            />
            <TextField
              select
              label={texts.stock.reason}
              value={writeOffReason}
              onChange={(event) => setWriteOffReason(event.target.value as WriteOffReason)}
            >
              {writeOffReasons.map((reason) => (
                <MenuItem key={reason} value={reason}>
                  {texts.movementReasons[reason]}
                </MenuItem>
              ))}
            </TextField>
          </>
        )}

        {mode === "edit" && (
          <>
            <TextField
              select
              label={texts.stock.storageLocation}
              value={storageLocationId}
              onChange={(event) => setStorageLocationId(Number(event.target.value))}
            >
              {storageLocations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {displayStorageLocationName(location)}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              type="date"
              label={texts.stock.expirationDate}
              value={expirationDate}
              onChange={(event) => setExpirationDate(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <QuantityInput
              label={texts.stock.correctedQuantity}
              baseUnit={food.baseUnit}
              value={correctionText}
              unitSymbol={correctionUnitSymbol}
              onValueChange={setCorrectionText}
              onUnitSymbolChange={setCorrectionUnitSymbol}
            />
            <Typography variant="body2" color="text.secondary">
              {texts.stock.correctionHint}
            </Typography>
          </>
        )}

        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle1">{texts.stock.historyTitle}</Typography>
        <List dense>
          {movementsQuery.data?.map((movement) => (
            <ListItem key={movement.id} disableGutters>
              <ListItemText
                primary={`${texts.movementReasons[movement.reason]}: ${movement.quantityChange > 0 ? "+" : "−"}${formatQuantity(
                  Math.abs(movement.quantityChange),
                  food.baseUnit,
                )}`}
                secondary={`${movement.userDisplayName ?? texts.stock.unknownUser}, ${formatTimestamp(movement.createdAt)}`}
              />
            </ListItem>
          ))}
          <ListItem disableGutters>
            <ListItemText secondary={texts.stock.addedOn(formatTimestamp(stockItem.createdAt))} />
          </ListItem>
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={mode === "overview" ? onClose : () => setMode("overview")}>
          {texts.common.cancel}
        </Button>
        {mode === "writeOff" && (
          <Button variant="contained" onClick={submitWriteOff} disabled={actionMutation.isPending}>
            {texts.stock.writeOff}
          </Button>
        )}
        {mode === "edit" && (
          <Button variant="contained" onClick={submitEdit} disabled={actionMutation.isPending}>
            {texts.common.save}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
