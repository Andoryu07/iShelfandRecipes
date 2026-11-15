import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import {
  Alert,
  Avatar,
  Button,
  Card,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  changeStorageLocationIcon,
  createStorageLocation,
  deleteStorageLocation,
  renameStorageLocation,
} from "../api/householdsApi";
import { ApiError } from "../api/apiClient";
import type { StorageLocation } from "../api/types";
import { IconPickerSheet } from "../components/IconPicker";
import { StorageLocationHistorySheet } from "./StorageLocationHistorySheet";
import { storageLocationIcon, storageLocationIcons } from "../components/icons";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { TextInputDialog } from "../components/TextInputDialog";
import { describeError } from "../errorMessages";
import { displayStorageLocationName, texts } from "../translations/cs";
import { storageLocationsQueryKey, useStorageLocations } from "./useStorageLocations";

function describeDeletionError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return typeof error.detail === "string" && error.detail.startsWith("The last storage location")
      ? texts.household.lastStorageLocation
      : texts.household.storageLocationNotEmpty;
  }
  return describeError(error);
}

export function StorageLocationsSection({ householdId }: { householdId: number }) {
  const queryClient = useQueryClient();
  const queryKey = storageLocationsQueryKey(householdId);
  const [isCreating, setIsCreating] = useState(false);
  const [storageLocationToRename, setStorageLocationToRename] = useState<StorageLocation | null>(null);
  const [storageLocationToDelete, setStorageLocationToDelete] = useState<StorageLocation | null>(null);
  const [storageLocationForIcon, setStorageLocationForIcon] = useState<StorageLocation | null>(null);
  const [storageLocationForHistory, setStorageLocationForHistory] = useState<StorageLocation | null>(null);

  const storageLocationsQuery = useStorageLocations(householdId);
  const onSuccess = () => queryClient.invalidateQueries({ queryKey });
  const createMutation = useMutation({
    mutationFn: (name: string) => createStorageLocation(householdId, name, "custom"),
    onSuccess,
  });
  const renameMutation = useMutation({
    mutationFn: ({ storageLocationId, name }: { storageLocationId: number; name: string }) =>
      renameStorageLocation(storageLocationId, name),
    onSuccess,
  });
  const deleteMutation = useMutation({ mutationFn: deleteStorageLocation, onSuccess });
  const iconMutation = useMutation({
    mutationFn: ({ storageLocationId, icon }: { storageLocationId: number; icon: string | null }) =>
      changeStorageLocationIcon(storageLocationId, icon),
    onSuccess,
  });
  const errorMessage =
    (storageLocationsQuery.error && describeError(storageLocationsQuery.error)) ||
    (createMutation.error && describeError(createMutation.error)) ||
    (renameMutation.error && describeError(renameMutation.error)) ||
    (iconMutation.error && describeError(iconMutation.error)) ||
    (deleteMutation.error && describeDeletionError(deleteMutation.error));

  return (
    <section>
      <Typography className="listSectionTitle" component="h2">
        {texts.household.storageLocationsTitle}
      </Typography>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <Card>
        <List disablePadding>
          {storageLocationsQuery.data?.map((storageLocation, index) => (
            <ListItem
              key={storageLocation.id}
              divider={index < (storageLocationsQuery.data?.length ?? 0) - 1}
              secondaryAction={
                <>
                  <IconButton
                    aria-label={texts.history.openHistory}
                    onClick={() => setStorageLocationForHistory(storageLocation)}
                  >
                    <HistoryRoundedIcon />
                  </IconButton>
                  <IconButton
                    aria-label={texts.common.rename}
                    onClick={() => setStorageLocationToRename(storageLocation)}
                  >
                    <EditRoundedIcon />
                  </IconButton>
                  <IconButton
                    edge="end"
                    aria-label={texts.common.delete}
                    onClick={() => setStorageLocationToDelete(storageLocation)}
                  >
                    <DeleteOutlineRoundedIcon />
                  </IconButton>
                </>
              }
            >
              <ListItemAvatar>
                <IconButton
                  aria-label={texts.icons.changeStorageLocationIcon}
                  onClick={() => setStorageLocationForIcon(storageLocation)}
                  sx={{ p: 0 }}
                >
                  <Avatar sx={{ bgcolor: "action.hover" }}>{storageLocationIcon(storageLocation)}</Avatar>
                </IconButton>
              </ListItemAvatar>
              <ListItemButton
                onClick={() => setStorageLocationForHistory(storageLocation)}
                sx={{ borderRadius: 2, mr: 15, px: 1 }}
              >
                <ListItemText
                  primary={displayStorageLocationName(storageLocation)}
                  secondary={
                    displayStorageLocationName(storageLocation) ===
                    texts.storageLocationKinds[storageLocation.kind]
                      ? null
                      : texts.storageLocationKinds[storageLocation.kind]
                  }
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Card>
      <Button startIcon={<AddRoundedIcon />} onClick={() => setIsCreating(true)}>
        {texts.household.newStorageLocation}
      </Button>

      {isCreating && (
        <TextInputDialog
          title={texts.household.newStorageLocation}
          label={texts.household.storageLocationName}
          initialValue=""
          onSubmit={(name) => {
            createMutation.mutate(name);
            setIsCreating(false);
          }}
          onClose={() => setIsCreating(false)}
        />
      )}
      {storageLocationToRename && (
        <TextInputDialog
          title={texts.common.rename}
          label={texts.household.storageLocationName}
          initialValue={displayStorageLocationName(storageLocationToRename)}
          onSubmit={(name) => {
            renameMutation.mutate({ storageLocationId: storageLocationToRename.id, name });
            setStorageLocationToRename(null);
          }}
          onClose={() => setStorageLocationToRename(null)}
        />
      )}
      {storageLocationForHistory && (
        <StorageLocationHistorySheet
          storageLocation={storageLocationForHistory}
          storageLocations={storageLocationsQuery.data ?? []}
          onClose={() => setStorageLocationForHistory(null)}
        />
      )}
      <IconPickerSheet
        open={storageLocationForIcon !== null}
        value={storageLocationForIcon?.icon ?? null}
        automaticIcon={
          storageLocationForIcon ? storageLocationIcon({ ...storageLocationForIcon, icon: null }) : ""
        }
        icons={storageLocationIcons}
        onClose={() => setStorageLocationForIcon(null)}
        onChange={(icon) => {
          if (storageLocationForIcon) {
            iconMutation.mutate({ storageLocationId: storageLocationForIcon.id, icon });
          }
          setStorageLocationForIcon(null);
        }}
      />
      <ConfirmationDialog
        message={
          storageLocationToDelete
            ? texts.household.deleteStorageLocationConfirmation(
                displayStorageLocationName(storageLocationToDelete),
              )
            : null
        }
        confirmLabel={texts.common.delete}
        onConfirm={() => {
          if (storageLocationToDelete) {
            deleteMutation.mutate(storageLocationToDelete.id);
          }
          setStorageLocationToDelete(null);
        }}
        onClose={() => setStorageLocationToDelete(null)}
      />
    </section>
  );
}
