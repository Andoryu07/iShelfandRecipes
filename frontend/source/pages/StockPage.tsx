import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Fab,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { useSearchParams } from "react-router";
import { listStockItems } from "../api/stockApi";
import type { StockItem, StorageLocation } from "../api/types";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { useExpirationWarningDays } from "../households/useCurrentHousehold";
import { useStorageLocations } from "../households/useStorageLocations";
import { AddStockItemDialog } from "../stock/AddStockItemDialog";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { storageLocationIcon } from "../components/icons";
import { ExpirationChip } from "../stock/ExpirationChip";
import { formatQuantity } from "../stock/quantities";
import { StockItemDialog } from "../stock/StockItemDialog";
import { groupStockItems, recentFoods, type StockGroup } from "../stock/stockGroups";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { SwipeableRow } from "../stock/SwipeableRow";
import { useQuickWriteOff, type QuickWriteOffReason } from "../stock/useQuickWriteOff";
import { displayStorageLocationName, texts } from "../translations/cs";

const swipeHintStorageKey = "iShelf.swipeHintSeen";

export function StockPage() {
  const { household } = useCurrentHousehold();
  return household ? <StockList householdId={household.id} /> : null;
}

function StockList({ householdId }: { householdId: number }) {
  const [search, setSearch] = useState("");
  const [selectedStorageLocationId, setSelectedStorageLocationId] = useState<number | undefined>(undefined);
  const [searchParameters, setSearchParameters] = useSearchParams();
  const [isAdding, setIsAdding] = useState(searchParameters.get("add") === "1");
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const requestedStockItemId = Number(searchParameters.get("item")) || null;
  const deferredSearch = useDeferredValue(search.trim());
  const storageLocations = useStorageLocations(householdId).data ?? [];
  const filters = { storageLocationId: selectedStorageLocationId, search: deferredSearch };
  const stockQuery = useQuery({
    queryKey: [...stockItemsQueryKey(householdId), filters],
    queryFn: () => listStockItems(householdId, filters),
    placeholderData: (previousData) => previousData,
  });
  const openedStockItem =
    selectedStockItem ??
    (requestedStockItemId
      ? (stockQuery.data?.find((stockItem) => stockItem.id === requestedStockItemId) ?? null)
      : null);

  function clearRequestedDialogs() {
    if (searchParameters.size > 0) {
      setSearchParameters({}, { replace: true });
    }
  }
  const storageLocationsById = new Map<number, StorageLocation>(
    storageLocations.map((storageLocation) => [storageLocation.id, storageLocation]),
  );
  const warningDays = useExpirationWarningDays();
  const quickWriteOff = useQuickWriteOff(householdId);
  const [isFullyReservedMessageOpen, setIsFullyReservedMessageOpen] = useState(false);
  const visibleItems = (stockQuery.data ?? []).filter(
    (stockItem) => stockItem.id !== quickWriteOff.pending?.stockItem.id,
  );
  const groups = groupStockItems(visibleItems, new Date(), warningDays);

  const [isSwipeHintVisible, setIsSwipeHintVisible] = useState(() => {
    try {
      return localStorage.getItem(swipeHintStorageKey) !== "seen";
    } catch {
      return false;
    }
  });

  function hideSwipeHint() {
    setIsSwipeHintVisible(false);
    try {
      localStorage.setItem(swipeHintStorageKey, "seen");
    } catch {
      // The hint is only a convenience.
    }
  }

  function writeOffQuickly(stockItem: StockItem, reason: QuickWriteOffReason) {
    hideSwipeHint();
    if (!quickWriteOff.start(stockItem, reason)) {
      setIsFullyReservedMessageOpen(true);
    }
  }
  const isFiltered = Boolean(deferredSearch) || selectedStorageLocationId !== undefined;

  return (
    <>
      <TextField
        placeholder={texts.stock.searchPlaceholder}
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
      <Stack direction="row" spacing={1} sx={{ overflowX: "auto", pb: 1 }}>
        <Chip
          label={texts.stock.allStorageLocations}
          color={selectedStorageLocationId === undefined ? "primary" : "default"}
          onClick={() => setSelectedStorageLocationId(undefined)}
        />
        {storageLocations.map((storageLocation) => (
          <Chip
            key={storageLocation.id}
            label={`${storageLocationIcon(storageLocation)} ${displayStorageLocationName(storageLocation)}`}
            color={selectedStorageLocationId === storageLocation.id ? "primary" : "default"}
            onClick={() => setSelectedStorageLocationId(storageLocation.id)}
          />
        ))}
      </Stack>

      {stockQuery.error && <Alert severity="error">{describeError(stockQuery.error)}</Alert>}
      {stockQuery.data?.length === 0 && (
        <Stack sx={{ alignItems: "center", textAlign: "center", mt: 6, gap: 1 }}>
          <Typography sx={{ fontSize: 48 }}>🧺</Typography>
          <Typography color="text.secondary">
            {isFiltered ? texts.stock.nothingFound : texts.stock.empty}
          </Typography>
          {!isFiltered && (
            <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setIsAdding(true)}>
              {texts.stock.addStockItem}
            </Button>
          )}
        </Stack>
      )}
      {isSwipeHintVisible && visibleItems.length > 0 && (
        <Alert severity="info" icon={false} onClose={hideSwipeHint} sx={{ mt: 1.5 }}>
          {texts.stock.swipeHint}
        </Alert>
      )}
      {[
        { title: texts.stock.soonSection, groups: groups.soon },
        { title: texts.stock.otherSection, groups: groups.other },
      ]
        .filter((section) => section.groups.length > 0)
        .map((section) => (
          <Box key={section.title}>
            <Typography className="listSectionTitle" component="h2">
              {section.title}
            </Typography>
            <Card>
              <List disablePadding>
                {section.groups.map((group, index) => (
                  <StockGroupRow
                    key={group.food.id}
                    group={group}
                    isLast={index === section.groups.length - 1}
                    storageLocationsById={storageLocationsById}
                    showStorageLocation={selectedStorageLocationId === undefined}
                    onOpenItem={setSelectedStockItem}
                    onWriteOff={writeOffQuickly}
                  />
                ))}
              </List>
            </Card>
          </Box>
        ))}

      <Box sx={{ height: 72 }} />
      <Fab
        color="primary"
        aria-label={texts.stock.addStockItem}
        onClick={() => setIsAdding(true)}
        sx={{
          position: "fixed",
          right: 16,
          bottom: "calc(var(--bottom-navigation-height) + var(--safe-area-bottom) + 16px)",
        }}
      >
        <AddRoundedIcon />
      </Fab>

      <Snackbar
        open={quickWriteOff.pending !== null}
        message={
          quickWriteOff.pending
            ? texts.stock.quickWriteOffDone(
                quickWriteOff.pending.reason,
                quickWriteOff.pending.stockItem.food.name,
                formatQuantity(quickWriteOff.pending.quantity, quickWriteOff.pending.stockItem.food.baseUnit),
              )
            : ""
        }
        action={
          <Button color="inherit" size="small" onClick={quickWriteOff.undo}>
            {texts.stock.undo}
          </Button>
        }
        sx={{
          bottom: { xs: "calc(var(--bottom-navigation-height) + var(--safe-area-bottom) + 8px)", md: 24 },
        }}
      />
      <Snackbar
        open={quickWriteOff.error !== null || isFullyReservedMessageOpen}
        autoHideDuration={4000}
        onClose={() => {
          quickWriteOff.clearError();
          setIsFullyReservedMessageOpen(false);
        }}
        message={quickWriteOff.error ?? texts.stock.quickWriteOffReserved}
      />
      {isAdding && (
        <AddStockItemDialog
          householdId={householdId}
          storageLocations={storageLocations}
          initialStorageLocationId={selectedStorageLocationId}
          recentFoods={recentFoods(stockQuery.data ?? [])}
          onClose={() => {
            setIsAdding(false);
            clearRequestedDialogs();
          }}
        />
      )}
      {openedStockItem && (
        <StockItemDialog
          householdId={householdId}
          stockItem={openedStockItem}
          storageLocations={storageLocations}
          onClose={() => {
            setSelectedStockItem(null);
            clearRequestedDialogs();
          }}
        />
      )}
    </>
  );
}

interface StockGroupRowProps {
  group: StockGroup;
  isLast: boolean;
  storageLocationsById: Map<number, StorageLocation>;
  showStorageLocation: boolean;
  onOpenItem: (stockItem: StockItem) => void;
  onWriteOff: (stockItem: StockItem, reason: QuickWriteOffReason) => void;
}

function StockGroupRow({
  group,
  isLast,
  storageLocationsById,
  showStorageLocation,
  onOpenItem,
  onWriteOff,
}: StockGroupRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { food } = group;
  const hasSeveralItems = group.items.length > 1;
  const locationNames = group.storageLocationIds
    .map((storageLocationId) => storageLocationsById.get(storageLocationId))
    .filter((storageLocation): storageLocation is StorageLocation => storageLocation !== undefined)
    .map(displayStorageLocationName)
    .join(", ");
  const details = [
    showStorageLocation ? locationNames : null,
    group.reservedQuantity > 0
      ? texts.stock.reserved(formatQuantity(group.reservedQuantity, food.baseUnit))
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <SwipeableRow
        rightLabel={texts.stock.swipeEaten}
        leftLabel={texts.stock.swipeSpoiled}
        onSwipeRight={() => onWriteOff(group.items[0], "eaten")}
        onSwipeLeft={() => onWriteOff(group.items[0], "spoiled")}
      >
        <ListItemButton
          className="animateAppear"
          divider={!isLast && !isExpanded}
          onClick={() => (hasSeveralItems ? setIsExpanded(!isExpanded) : onOpenItem(group.items[0]))}
          sx={{ py: 1 }}
        >
          <ListItemAvatar>
            <CategoryAvatar
              category={food.category}
              genericName={food.genericName}
              icon={food.icon}
              photoUrl={food.photoUrl}
            />
          </ListItemAvatar>
          <ListItemText
            primary={hasSeveralItems ? `${food.name}  ×${group.items.length}` : food.name}
            secondary={details || null}
            slotProps={{ primary: { sx: { fontWeight: 600 } } }}
          />
          <Stack sx={{ alignItems: "flex-end", gap: 0.5, ml: 1 }}>
            <Typography sx={{ fontWeight: 650, whiteSpace: "nowrap" }}>
              {formatQuantity(group.totalQuantity, food.baseUnit)}
            </Typography>
            <ExpirationChip expirationDate={group.nearestExpirationDate} />
          </Stack>
          {hasSeveralItems &&
            (isExpanded ? (
              <ExpandLessRoundedIcon color="action" sx={{ ml: 0.5 }} />
            ) : (
              <ExpandMoreRoundedIcon color="action" sx={{ ml: 0.5 }} />
            ))}
        </ListItemButton>
      </SwipeableRow>
      {hasSeveralItems && (
        <Collapse in={isExpanded} unmountOnExit>
          <List disablePadding sx={{ bgcolor: "action.hover" }}>
            {group.items.map((stockItem, index) => {
              const location = storageLocationsById.get(stockItem.storageLocationId);
              return (
                <ListItemButton
                  key={stockItem.id}
                  divider={!isLast || index < group.items.length - 1}
                  onClick={() => onOpenItem(stockItem)}
                  sx={{ pl: 9 }}
                >
                  <ListItemText
                    primary={formatQuantity(stockItem.quantity, food.baseUnit)}
                    secondary={location ? displayStorageLocationName(location) : null}
                  />
                  <ExpirationChip expirationDate={stockItem.expirationDate} />
                </ListItemButton>
              );
            })}
          </List>
        </Collapse>
      )}
    </>
  );
}
