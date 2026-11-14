import type { StorageLocation, StorageLocationKind } from "../api/types";

export const foodIcons = [
  "🥛",
  "🧀",
  "🧈",
  "🥚",
  "🥩",
  "🍗",
  "🥓",
  "🌭",
  "🐟",
  "🦐",
  "🍎",
  "🍐",
  "🍌",
  "🍇",
  "🍓",
  "🍒",
  "🍋",
  "🍊",
  "🥝",
  "🍑",
  "🥕",
  "🥔",
  "🧅",
  "🧄",
  "🥒",
  "🍅",
  "🌶️",
  "🥦",
  "🥬",
  "🍄",
  "🍞",
  "🥐",
  "🥖",
  "🥨",
  "🍚",
  "🍝",
  "🌾",
  "🫘",
  "🥫",
  "🫒",
  "🧂",
  "🍯",
  "🍫",
  "🍪",
  "🍰",
  "🍦",
  "🥤",
  "🧃",
  "☕",
  "🍵",
  "🍺",
  "🍷",
  "💧",
  "🧊",
  "🍲",
  "🍕",
  "🥗",
  "🥞",
  "🍜",
  "🍽️",
];

export const storageLocationIcons = ["🧊", "❄️", "🥫", "📦", "🗄️", "🧺", "🍷", "🏠", "🚗", "🏢", "🛒", "🎒"];

const storageLocationKindIcons: Record<StorageLocationKind, string> = {
  fridge: "🧊",
  freezer: "❄️",
  pantry: "🥫",
  custom: "📦",
};

export function storageLocationIcon(storageLocation: StorageLocation): string {
  return storageLocation.icon ?? storageLocationKindIcons[storageLocation.kind];
}

export function recipeIcon(recipe: { icon?: string | null; isPredefined: boolean }): string {
  return recipe.icon ?? (recipe.isPredefined ? "🍲" : "🍽️");
}
