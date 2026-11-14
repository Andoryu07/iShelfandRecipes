import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import { Card, List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import type { ReactNode } from "react";

export interface SettingsItem {
  icon: ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
}

export function SettingsList({ items }: { items: SettingsItem[] }) {
  return (
    <Card sx={{ mt: 2 }}>
      <List disablePadding>
        {items.map((item, index) => (
          <ListItemButton key={item.label} divider={index < items.length - 1} onClick={item.onClick}>
            <ListItemIcon sx={{ minWidth: 44 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} secondary={item.description} />
            <ChevronRightRoundedIcon color="action" />
          </ListItemButton>
        ))}
      </List>
    </Card>
  );
}
