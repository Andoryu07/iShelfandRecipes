import {
  Avatar,
  Box,
  Button,
  ButtonBase,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { texts } from "../translations/cs";
import { BottomSheet } from "./BottomSheet";

interface IconPickerProps {
  value: string | null;
  automaticIcon: string;
  icons: string[];
  onChange: (icon: string | null) => void;
}

export function IconPicker({ value, automaticIcon, icons, onChange }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, mt: 1 }}>
        <Avatar sx={{ bgcolor: "action.hover", fontSize: 22 }}>{value ?? automaticIcon}</Avatar>
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
          {value ? texts.icons.ownIcon : texts.icons.automaticIcon}
        </Typography>
        <Button size="small" onClick={() => setIsOpen(true)}>
          {texts.icons.change}
        </Button>
      </Stack>
      <IconPickerSheet
        open={isOpen}
        value={value}
        automaticIcon={automaticIcon}
        icons={icons}
        onClose={() => setIsOpen(false)}
        onChange={(icon) => {
          onChange(icon);
          setIsOpen(false);
        }}
      />
    </>
  );
}

interface IconPickerSheetProps extends IconPickerProps {
  open: boolean;
  onClose: () => void;
}

export function IconPickerSheet({
  open,
  value,
  automaticIcon,
  icons,
  onChange,
  onClose,
}: IconPickerSheetProps) {
  const cell = (icon: string | null, label: string) => {
    const isSelected = icon === value;
    return (
      <ButtonBase
        key={icon ?? "automatic"}
        aria-label={label}
        aria-pressed={isSelected}
        onClick={() => onChange(icon)}
        sx={{
          aspectRatio: "1",
          borderRadius: 3,
          fontSize: 26,
          border: 2,
          borderColor: isSelected ? "primary.main" : "transparent",
          bgcolor: "action.hover",
        }}
      >
        {icon ?? automaticIcon}
      </ButtonBase>
    );
  };
  return (
    <BottomSheet open={open} onClose={onClose}>
      <DialogTitle>{texts.icons.title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {texts.icons.automaticHint}
        </Typography>
        <Box
          sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(48px, 1fr))", gap: 1, pb: 2 }}
        >
          {cell(null, texts.icons.automaticIcon)}
          {icons.map((icon) => cell(icon, icon))}
        </Box>
      </DialogContent>
    </BottomSheet>
  );
}
