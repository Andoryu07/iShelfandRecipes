import {
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { getStorageLocationHistory } from "../api/householdsApi";
import type { StorageLocation, StorageLocationHistoryEvent } from "../api/types";
import { BottomSheet } from "../components/BottomSheet";
import { CategoryAvatar } from "../components/CategoryAvatar";
import { describeError } from "../errorMessages";
import { formatQuantity } from "../stock/quantities";
import { displayStorageLocationName, formatTimestamp, texts } from "../translations/cs";

interface StorageLocationHistorySheetProps {
  storageLocation: StorageLocation;
  storageLocations: StorageLocation[];
  onClose: () => void;
}

export function StorageLocationHistorySheet({
  storageLocation,
  storageLocations,
  onClose,
}: StorageLocationHistorySheetProps) {
  const historyQuery = useQuery({
    queryKey: ["storageLocations", storageLocation.id, "history"],
    queryFn: () => getStorageLocationHistory(storageLocation.id),
    staleTime: 0,
  });
  const events = historyQuery.data ?? [];

  function locationName(storageLocationId: number | null): string {
    const location = storageLocations.find((candidate) => candidate.id === storageLocationId);
    return location ? displayStorageLocationName(location) : texts.history.unknownStorageLocation;
  }

  function describe(event: StorageLocationHistoryEvent): string {
    if (event.kind === "movedIn") {
      return texts.history.movedIn(locationName(event.otherStorageLocationId));
    }
    if (event.kind === "movedOut") {
      return texts.history.movedOut(locationName(event.otherStorageLocationId));
    }
    const label = event.kind === "added" ? texts.history.added : texts.movementReasons[event.kind];
    const quantity = event.quantity === null ? "" : ` ${formatQuantity(event.quantity, event.food.baseUnit)}`;
    return `${label}${quantity}`;
  }

  function author(event: StorageLocationHistoryEvent): string | null {
    if (event.userDisplayName) {
      return event.userDisplayName;
    }
    return event.kind === "added" ? null : texts.stock.unknownUser;
  }

  return (
    <BottomSheet open onClose={onClose}>
      <DialogTitle>
        {texts.history.storageLocationTitle(displayStorageLocationName(storageLocation))}
      </DialogTitle>
      <DialogContent>
        {historyQuery.error && <Typography color="error">{describeError(historyQuery.error)}</Typography>}
        {historyQuery.isSuccess && events.length === 0 && (
          <Typography color="text.secondary">{texts.history.storageLocationEmpty}</Typography>
        )}
        <List dense>
          {events.map((event, index) => (
            <ListItem key={index} disableGutters>
              <ListItemAvatar>
                <CategoryAvatar
                  category={event.food.category}
                  genericName={event.food.genericName}
                  icon={event.food.icon}
                  photoUrl={event.food.photoUrl}
                  size={36}
                />
              </ListItemAvatar>
              <ListItemText
                primary={`${event.food.name}: ${describe(event)}`}
                secondary={
                  author(event)
                    ? `${author(event)}, ${formatTimestamp(event.createdAt)}`
                    : formatTimestamp(event.createdAt)
                }
              />
            </ListItem>
          ))}
        </List>
      </DialogContent>
    </BottomSheet>
  );
}
