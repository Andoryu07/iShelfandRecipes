import { Avatar } from "@mui/material";
import type { FoodCategory } from "../api/types";

export const categoryEmoji: Record<FoodCategory, string> = {
  dairy: "🥛",
  meatAndSausages: "🥩",
  fish: "🐟",
  fruit: "🍎",
  vegetables: "🥕",
  bakery: "🍞",
  dryGoods: "🍝",
  canned: "🥫",
  frozen: "🧊",
  beverages: "🥤",
  spices: "🧂",
  sweets: "🍫",
  other: "🛒",
};

const kindEmoji: Record<string, string> = {
  sýr: "🧀",
  vejce: "🥚",
  máslo: "🧈",
  chléb: "🍞",
  pečivo: "🥐",
  rohlík: "🥖",
  jogurt: "🥣",
  ryba: "🐟",
  uzeniny: "🥓",
  slanina: "🥓",
  brambory: "🥔",
  cibule: "🧅",
  česnek: "🧄",
  mrkev: "🥕",
  rýže: "🍚",
  těstoviny: "🍝",
  olej: "🫒",
  citron: "🍋",
};

interface CategoryAvatarProps {
  category: FoodCategory;
  genericName?: string | null;
  icon?: string | null;
  size?: number;
}

export function automaticFoodIcon(category: FoodCategory, genericName?: string | null): string {
  return (genericName && kindEmoji[genericName.trim().toLowerCase()]) || categoryEmoji[category];
}

export function CategoryAvatar({ category, genericName, icon, size = 40 }: CategoryAvatarProps) {
  const emoji = icon || automaticFoodIcon(category, genericName);
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        bgcolor: "action.hover",
      }}
    >
      {emoji}
    </Avatar>
  );
}
