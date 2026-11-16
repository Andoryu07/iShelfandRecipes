import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import PhotoLibraryOutlinedIcon from "@mui/icons-material/PhotoLibraryOutlined";
import {
  Box,
  ButtonBase,
  CircularProgress,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Snackbar,
} from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";
import { deleteFoodPhoto, updateFood, uploadFoodPhoto } from "../api/stockApi";
import type { Food } from "../api/types";
import { automaticFoodIcon, CategoryAvatar } from "../components/CategoryAvatar";
import { IconPickerSheet } from "../components/IconPicker";
import { foodIcons } from "../components/icons";
import { shoppingListQueryKey } from "../shopping/useShoppingList";
import { stockItemsQueryKey } from "../stock/stockQueries";
import { texts } from "../translations/cs";
import { usePlan } from "../plans/usePlan";
import { compressFoodPhoto } from "./compressFoodPhoto";

interface FoodAvatarMenuProps {
  householdId: number;
  food: Food;
}

export function FoodAvatarMenu({ householdId, food }: FoodAvatarMenuProps) {
  const queryClient = useQueryClient();
  const [currentFood, setCurrentFood] = useState(food);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const canUploadPhotos = usePlan().data?.canUploadFoodPhotos ?? true;
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (change: () => Promise<Food>) => change(),
    onSuccess: async (changedFood) => {
      setCurrentFood(changedFood);
      await Promise.all(
        [
          stockItemsQueryKey(householdId),
          shoppingListQueryKey(householdId),
          ["households", householdId, "foods"],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      );
    },
  });

  function choose(action: () => void) {
    setMenuAnchor(null);
    action();
  }

  function uploadChosenFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      mutation.mutate(async () => uploadFoodPhoto(food.id, await compressFoodPhoto(file)));
    }
  }

  return (
    <>
      <ButtonBase
        aria-label={texts.foodPhotos.menuLabel}
        disabled={mutation.isPending}
        onClick={(event) => setMenuAnchor(event.currentTarget)}
        sx={{ borderRadius: "50%", position: "relative", flexShrink: 0 }}
      >
        <CategoryAvatar
          category={currentFood.category}
          genericName={currentFood.genericName}
          icon={currentFood.icon}
          photoUrl={currentFood.photoUrl}
          size={48}
        />
        <Box
          sx={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 22,
            height: 22,
            borderRadius: "50%",
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "grid",
            placeItems: "center",
            border: 2,
            borderColor: "background.paper",
          }}
        >
          {mutation.isPending ? (
            <CircularProgress size={12} color="inherit" />
          ) : (
            <EditRoundedIcon sx={{ fontSize: 12 }} />
          )}
        </Box>
      </ButtonBase>
      <Menu anchorEl={menuAnchor} open={menuAnchor !== null} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => choose(() => setIsIconPickerOpen(true))}>
          <ListItemIcon>
            <EmojiEmotionsOutlinedIcon />
          </ListItemIcon>
          <ListItemText>{texts.foodPhotos.changeIcon}</ListItemText>
        </MenuItem>
        {!canUploadPhotos && (
          <MenuItem disabled>
            <ListItemText
              secondary={texts.guest.photosNeedAccount}
              slotProps={{ secondary: { sx: { whiteSpace: "normal" } } }}
            />
          </MenuItem>
        )}
        <MenuItem disabled={!canUploadPhotos} onClick={() => choose(() => cameraInput.current?.click())}>
          <ListItemIcon>
            <PhotoCameraOutlinedIcon />
          </ListItemIcon>
          <ListItemText>{texts.foodPhotos.takePhoto}</ListItemText>
        </MenuItem>
        <MenuItem disabled={!canUploadPhotos} onClick={() => choose(() => galleryInput.current?.click())}>
          <ListItemIcon>
            <PhotoLibraryOutlinedIcon />
          </ListItemIcon>
          <ListItemText>{texts.foodPhotos.choosePhoto}</ListItemText>
        </MenuItem>
        {currentFood.photoUrl && (
          <MenuItem onClick={() => choose(() => mutation.mutate(() => deleteFoodPhoto(food.id)))}>
            <ListItemIcon>
              <DeleteOutlineRoundedIcon />
            </ListItemIcon>
            <ListItemText>{texts.foodPhotos.removePhoto}</ListItemText>
          </MenuItem>
        )}
      </Menu>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={uploadChosenFile}
      />
      <input ref={galleryInput} type="file" accept="image/*" hidden onChange={uploadChosenFile} />
      <IconPickerSheet
        open={isIconPickerOpen}
        value={currentFood.icon ?? null}
        automaticIcon={automaticFoodIcon(currentFood.category, currentFood.genericName)}
        icons={foodIcons}
        onClose={() => setIsIconPickerOpen(false)}
        onChange={(icon) => {
          setIsIconPickerOpen(false);
          mutation.mutate(() => updateFood(food.id, { icon }));
        }}
      />
      <Snackbar
        open={mutation.isError}
        autoHideDuration={4000}
        onClose={() => mutation.reset()}
        message={texts.foodPhotos.failed}
      />
    </>
  );
}
