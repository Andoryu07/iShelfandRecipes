import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import { Alert, Button, IconButton, List, ListItem, ListItemText, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { createStorageLocation, deleteStorageLocation, renameStorageLocation } from "../api/householdsApi";
import { ApiError } from "../api/apiClient";
import type { StorageLocation } from "../api/types";
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
  const errorMessage =
    (storageLocationsQuery.error && describeError(storageLocationsQuery.error)) ||
    (createMutation.error && describeError(createMutation.error)) ||
    (renameMutation.error && describeError(renameMutation.error)) ||
    (deleteMutation.error && describeDeletionError(deleteMutation.error));

  return (
    <section className="section">
      <Typography variant="h6" component="h2">
        {texts.household.storageLocationsTitle}
      </Typography>
      {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
      <List>
        {storageLocationsQuery.data?.map((storageLocation) => (
          <ListItem
            key={storageLocation.id}
            disableGutters
            secondaryAction={
              <>
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
            <ListItemText
              primary={displayStorageLocationName(storageLocation)}
              secondary={
                displayStorageLocationName(storageLocation) ===
                texts.storageLocationKinds[storageLocation.kind]
                  ? null
                  : texts.storageLocationKinds[storageLocation.kind]
              }
            />
          </ListItem>
        ))}
      </List>
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
