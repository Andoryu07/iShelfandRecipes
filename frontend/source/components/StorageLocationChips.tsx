import { Chip, Stack, Typography } from "@mui/material";
import type { StorageLocation } from "../api/types";
import { displayStorageLocationName, texts } from "../translations/cs";
import { storageLocationIcon } from "./icons";

interface StorageLocationChipsProps {
  storageLocations: StorageLocation[];
  value: number;
  onChange: (storageLocationId: number) => void;
}

export function StorageLocationChips({ storageLocations, value, onChange }: StorageLocationChipsProps) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
        {texts.stock.storageLocation}
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
        {storageLocations.map((storageLocation) => (
          <Chip
            key={storageLocation.id}
            label={`${storageLocationIcon(storageLocation)} ${displayStorageLocationName(storageLocation)}`}
            color={storageLocation.id === value ? "primary" : "default"}
            onClick={() => onChange(storageLocation.id)}
          />
        ))}
      </Stack>
    </>
  );
}
