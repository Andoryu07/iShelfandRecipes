import { Avatar } from "@mui/material";
import type { FoodCategory } from "../api/types";

const categoryEmoji: Record<FoodCategory, string> = {
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

export function CategoryAvatar({ category, size = 40 }: { category: FoodCategory; size?: number }) {
  return (
    <Avatar
      sx={{
        width: size,
        height: size,
        fontSize: size * 0.5,
        bgcolor: "action.hover",
      }}
    >
      {categoryEmoji[category]}
    </Avatar>
  );
}
