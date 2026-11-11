import AddRoundedIcon from "@mui/icons-material/AddRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Alert,
  Box,
  Chip,
  Fab,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { listStockItems } from "../api/stockApi";
import type { StockItem, StorageLocation } from "../api/types";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { useStorageLocations } from "../households/useStorageLocations";
import { AddStockItemDialog } from "../stock/AddStockItemDialog";
import { expirationStatus, localDateText, type ExpirationStatus } from "../stock/expiration";
import { formatQuantity } from "../stock/quantities";
import { StockItemDialog } from "../stock/StockItemDialog";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { displayStorageLocationName, formatDate, texts } from "../translations/cs";

const expirationColors: Record<ExpirationStatus, string> = {
  none: "text.secondary",
  fresh: "text.secondary",
  soon: "warning.dark",
  expired: "error.main",
};

function describeExpiration(stockItem: StockItem, status: ExpirationStatus): string {
  if (!stockItem.expirationDate) {
    return texts.stock.noExpirationDate;
  }
  const date = formatDate(stockItem.expirationDate);
  if (status === "expired") {
    return texts.stock.expiredOn(date);
  }
  return stockItem.expirationDate === localDateText(new Date())
    ? texts.stock.expiresToday
    : texts.stock.expiresOn(date);
}

export function StockPage() {
  const { household } = useCurrentHousehold();
  return household ? <StockList householdId={household.id} /> : null;
}

function StockList({ householdId }: { householdId: number }) {
  const [search, setSearch] = useState("");
  const [selectedStorageLocationId, setSelectedStorageLocationId] = useState<number | undefined>(undefined);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStockItem, setSelectedStockItem] = useState<StockItem | null>(null);
  const deferredSearch = useDeferredValue(search.trim());
  const storageLocations = useStorageLocations(householdId).data ?? [];
  const filters = { storageLocationId: selectedStorageLocationId, search: deferredSearch };
  const stockQuery = useQuery({
    queryKey: [...stockItemsQueryKey(householdId), filters],
    queryFn: () => listStockItems(householdId, filters),
    placeholderData: (previousData) => previousData,
  });
  const storageLocationsById = new Map<number, StorageLocation>(
    storageLocations.map((storageLocation) => [storageLocation.id, storageLocation]),
  );
  const today = new Date();
  const isFiltered = Boolean(deferredSearch) || selectedStorageLocationId !== undefined;

  return (
    <>
      <Typography variant="h5" component="h1">
        {texts.navigation.stock}
      </Typography>
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
            label={displayStorageLocationName(storageLocation)}
            color={selectedStorageLocationId === storageLocation.id ? "primary" : "default"}
            onClick={() => setSelectedStorageLocationId(storageLocation.id)}
          />
        ))}
      </Stack>

      {stockQuery.error && <Alert severity="error">{describeError(stockQuery.error)}</Alert>}
      {stockQuery.data?.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          {isFiltered ? texts.stock.nothingFound : texts.stock.empty}
        </Typography>
      )}
      <List>
        {stockQuery.data?.map((stockItem) => {
          const status = expirationStatus(stockItem.expirationDate, today);
          const storageLocation = storageLocationsById.get(stockItem.storageLocationId);
          return (
            <ListItemButton key={stockItem.id} divider onClick={() => setSelectedStockItem(stockItem)}>
              <ListItemText
                primary={stockItem.food.name}
                secondary={
                  <>
                    {storageLocation && selectedStorageLocationId === undefined && (
                      <>{displayStorageLocationName(storageLocation)} · </>
                    )}
                    <Box
                      component="span"
                      sx={{
                        color: expirationColors[status],
                        fontWeight: status === "fresh" || status === "none" ? 400 : 600,
                      }}
                    >
                      {describeExpiration(stockItem, status)}
                    </Box>
                  </>
                }
              />
              <Typography sx={{ ml: 2, whiteSpace: "nowrap" }}>
                {formatQuantity(stockItem.quantity, stockItem.food.baseUnit)}
              </Typography>
            </ListItemButton>
          );
        })}
      </List>

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

      {isAdding && (
        <AddStockItemDialog
          householdId={householdId}
          storageLocations={storageLocations}
          initialStorageLocationId={selectedStorageLocationId}
          onClose={() => setIsAdding(false)}
        />
      )}
      {selectedStockItem && (
        <StockItemDialog
          householdId={householdId}
          stockItem={selectedStockItem}
          storageLocations={storageLocations}
          onClose={() => setSelectedStockItem(null)}
        />
      )}
    </>
  );
}
