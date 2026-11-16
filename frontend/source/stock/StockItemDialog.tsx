import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import {
  Alert,
  Button,
  Collapse,
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
import { useState, type FormEvent } from "react";
import { ApiError } from "../api/apiClient";
import { addShoppingListItem } from "../api/shoppingListApi";
import { shoppingListQueryKey } from "../shopping/useShoppingList";
import {
  cancelReservation,
  correctStockQuantity,
  createReservation,
  listStockMovements,
  updateFood,
  updateStockItem,
  writeOffStock,
} from "../api/stockApi";
import type { FoodCategory } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { StorageLocationChips } from "../components/StorageLocationChips";
import { FoodAvatarMenu } from "../foods/FoodAvatarMenu";
import { useAuthentication } from "../authentication/AuthenticationContext";
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
import { CategoryChips } from "./FoodPicker";
import { ExpirationDatePicker } from "./ExpirationDatePicker";
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
  const { user } = useAuthentication();
  const [mode, setMode] = useState<"overview" | "writeOff" | "edit" | "reserve">("overview");
  const [reservationNote, setReservationNote] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [foodCategory, setFoodCategory] = useState<FoodCategory>(stockItem.food.category);
  const [foodGenericName, setFoodGenericName] = useState(stockItem.food.genericName ?? "");
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
  const shoppingListMutation = useMutation({
    mutationFn: () => addShoppingListItem(householdId, { foodId: food.id, isPersonal: false }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: shoppingListQueryKey(householdId) }),
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

  const reservedByOthers = stockItem.reservations
    .filter((reservation) => reservation.userId !== user?.id)
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
  const edibleQuantity = Math.max(stockItem.quantity - reservedByOthers, 0);

  function submitReservation() {
    const baseQuantity = parseBaseQuantity(quantityText, food.baseUnit, unitSymbol);
    if (baseQuantity === null) {
      setInputError(texts.stock.invalidQuantity);
      return;
    }
    run(() =>
      createReservation(householdId, {
        stockItemId: stockItem.id,
        quantity: baseQuantity,
        note: reservationNote.trim() || null,
      }),
    );
  }

  function describeActionError(error: unknown): string {
    if (error instanceof ApiError && error.status === 409) {
      if (mode === "reserve") {
        return texts.stock.notEnoughFree;
      }
      return typeof error.detail === "string" && error.detail.includes("reserved")
        ? texts.stock.reservedByOthers
        : texts.stock.moreThanRemains;
    }
    return describeError(error);
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
    const foodChanges: { genericName?: string | null; category?: FoodCategory } = {};
    if (foodCategory !== food.category) {
      foodChanges.category = foodCategory;
    }
    if ((foodGenericName.trim() || null) !== food.genericName) {
      foodChanges.genericName = foodGenericName.trim() || null;
    }
    run(async () => {
      if (Object.keys(foodChanges).length > 0) {
        await updateFood(food.id, foodChanges);
        await queryClient.invalidateQueries({ queryKey: ["households", householdId] });
      }
      if (Object.keys(changes).length > 0) {
        await updateStockItem(stockItem.id, changes);
      }
      if (correctedQuantity !== null && correctedQuantity !== stockItem.quantity) {
        await correctStockQuantity(stockItem.id, correctedQuantity);
      }
    });
  }

  function submitCurrentMode(event: FormEvent) {
    event.preventDefault();
    if (mode === "writeOff") {
      submitWriteOff();
    } else if (mode === "edit") {
      submitEdit();
    } else if (mode === "reserve") {
      submitReservation();
    }
  }

  function storageLocationName(storageLocationId: number | null): string {
    const location = storageLocations.find((candidate) => candidate.id === storageLocationId);
    return location ? displayStorageLocationName(location) : texts.history.unknownStorageLocation;
  }

  const storageLocation = storageLocations.find((location) => location.id === stockItem.storageLocationId);
  const errorMessage =
    inputError ?? (actionMutation.error ? describeActionError(actionMutation.error) : null);

  return (
    <BottomSheet open onClose={onClose}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <FoodAvatarMenu householdId={householdId} food={food} />
        {food.name}
      </DialogTitle>
      <form onSubmit={submitCurrentMode} style={{ display: "contents" }}>
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
              {texts.stock.reserved(formatQuantity(stockItem.reservedQuantity, food.baseUnit))} ·{" "}
              {texts.stock.freeQuantity(formatQuantity(stockItem.availableQuantity, food.baseUnit))}
            </Typography>
          )}
          {stockItem.reservations.length > 0 && (
            <List dense>
              {stockItem.reservations.map((reservation) => (
                <ListItem
                  key={reservation.id}
                  disableGutters
                  secondaryAction={
                    reservation.userId === user?.id && (
                      <Button
                        size="small"
                        disabled={actionMutation.isPending}
                        onClick={() => run(() => cancelReservation(reservation.id))}
                      >
                        {texts.stock.cancelReservation}
                      </Button>
                    )
                  }
                >
                  <ListItemText
                    primary={texts.stock.reservationBy(
                      reservation.userDisplayName,
                      formatQuantity(reservation.quantity, food.baseUnit),
                    )}
                    secondary={reservation.note}
                  />
                </ListItem>
              ))}
            </List>
          )}

          {mode === "overview" && (
            <Stack spacing={1} sx={{ mt: 2 }}>
              <Button
                variant="contained"
                disabled={actionMutation.isPending || edibleQuantity <= 0}
                onClick={() => run(() => writeOffStock(stockItem.id, "eaten", edibleQuantity))}
              >
                {edibleQuantity < stockItem.quantity && edibleQuantity > 0
                  ? `${texts.stock.eatenAll} (${formatQuantity(edibleQuantity, food.baseUnit)})`
                  : texts.stock.eatenAll}
              </Button>
              {edibleQuantity <= 0 && (
                <Typography variant="body2" color="text.secondary">
                  {texts.stock.allReserved}
                </Typography>
              )}
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
              <Button onClick={() => setMode("reserve")} disabled={stockItem.availableQuantity <= 0}>
                {texts.stock.reserve}
              </Button>
              <Button
                startIcon={<ShoppingCartRoundedIcon />}
                onClick={() => shoppingListMutation.mutate()}
                disabled={shoppingListMutation.isPending || shoppingListMutation.isSuccess}
              >
                {texts.shoppingList.ranOut}
              </Button>
              {shoppingListMutation.isSuccess && (
                <Alert severity="success">{texts.shoppingList.addedFood(food.name)}</Alert>
              )}
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

          {mode === "reserve" && (
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
                label={texts.stock.reservationNote}
                value={reservationNote}
                onChange={(event) => setReservationNote(event.target.value)}
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
            </>
          )}

          {mode === "edit" && (
            <>
              <StorageLocationChips
                storageLocations={storageLocations}
                value={storageLocationId}
                onChange={setStorageLocationId}
              />
              <ExpirationDatePicker value={expirationDate} onChange={setExpirationDate} />
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
              <Typography className="listSectionTitle" component="h3">
                {texts.stock.editFood}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {texts.stock.category}
              </Typography>
              <CategoryChips value={foodCategory} onChange={setFoodCategory} />
              <TextField
                label={texts.stock.genericName}
                value={foodGenericName}
                onChange={(event) => setFoodGenericName(event.target.value)}
                helperText={texts.stock.genericNameHint}
                slotProps={{ htmlInput: { maxLength: 100 } }}
              />
            </>
          )}

          {errorMessage && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <Divider sx={{ my: 2 }} />
          <Button
            variant="outlined"
            startIcon={<HistoryRoundedIcon />}
            endIcon={isHistoryOpen ? <ExpandLessRoundedIcon /> : <ExpandMoreRoundedIcon />}
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
          >
            {texts.stock.historyTitle}
          </Button>
          <Collapse in={isHistoryOpen}>
            <List dense>
              {movementsQuery.data?.map((movement) => (
                <ListItem key={movement.id} disableGutters>
                  <ListItemText
                    primary={
                      movement.reason === "moved"
                        ? texts.history.movedBetween(
                            storageLocationName(movement.storageLocationId),
                            storageLocationName(movement.targetStorageLocationId),
                          )
                        : `${texts.movementReasons[movement.reason]}: ${movement.quantityChange > 0 ? "+" : "−"}${formatQuantity(
                            Math.abs(movement.quantityChange),
                            food.baseUnit,
                          )}`
                    }
                    secondary={`${movement.userDisplayName ?? texts.stock.unknownUser}, ${formatTimestamp(movement.createdAt)}`}
                  />
                </ListItem>
              ))}
              <ListItem disableGutters>
                <ListItemText secondary={texts.stock.addedOn(formatTimestamp(stockItem.createdAt))} />
              </ListItem>
            </List>
          </Collapse>
        </DialogContent>
        <DialogActions>
          <Button onClick={mode === "overview" ? onClose : () => setMode("overview")}>
            {texts.common.cancel}
          </Button>
          {mode === "writeOff" && (
            <Button type="submit" variant="contained" disabled={actionMutation.isPending}>
              {texts.stock.writeOff}
            </Button>
          )}
          {mode === "edit" && (
            <Button type="submit" variant="contained" disabled={actionMutation.isPending}>
              {texts.common.save}
            </Button>
          )}
          {mode === "reserve" && (
            <Button type="submit" variant="contained" disabled={actionMutation.isPending}>
              {texts.stock.reserve}
            </Button>
          )}
        </DialogActions>
      </form>
    </BottomSheet>
  );
}
