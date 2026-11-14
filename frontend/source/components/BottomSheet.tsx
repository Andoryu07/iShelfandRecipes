import { Box, Dialog, Drawer, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ open, onClose, children }: BottomSheetProps) {
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("md"));
  if (isWide) {
    return (
      <Dialog open={open} onClose={onClose} fullWidth>
        {children}
      </Dialog>
    );
  }
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      sx={{ zIndex: "modal" }}
      slotProps={{
        paper: {
          role: "dialog",
          sx: {
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            maxHeight: "92dvh",
            pb: "env(safe-area-inset-bottom, 0px)",
          },
        },
      }}
    >
      <Box
        sx={{ width: 40, height: 5, borderRadius: 3, bgcolor: "divider", mx: "auto", mt: 1, flexShrink: 0 }}
      />
      {children}
    </Drawer>
  );
}
