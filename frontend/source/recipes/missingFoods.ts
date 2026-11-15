import type {
  Food,
  FoodCategory,
  IngredientAvailability,
  StorageLocation,
  StorageLocationKind,
} from "../api/types";
import { displayUnits, quantityText } from "../stock/quantities";

export interface FoodRow {
  key: number;
  isSelected: boolean;
  quantityText: string;
  unitSymbol: string;
  storageLocationId: number;
  expirationDate: string;
}

const coldCategories: FoodCategory[] = ["dairy", "meatAndSausages", "fish", "vegetables"];

function preferredKind(category: FoodCategory): StorageLocationKind {
  if (category === "frozen") {
    return "freezer";
  }
  return coldCategories.includes(category) ? "fridge" : "pantry";
}

export function defaultStorageLocationId(
  category: FoodCategory,
  storageLocations: StorageLocation[],
): number {
  const preferred = storageLocations.find((location) => location.kind === preferredKind(category));
  return (preferred ?? storageLocations[0])?.id ?? 0;
}

export interface FoodToAdd {
  key: number;
  food: Food;
  quantity: number | null;
}

export function missingIngredientsToAdd(ingredients: IngredientAvailability[]): FoodToAdd[] {
  return ingredients
    .filter((ingredient) => !ingredient.isOptional && ingredient.missingQuantity > 0)
    .map((ingredient) => ({
      key: ingredient.ingredientId,
      food: ingredient.food,
      quantity:
        ingredient.food.baseUnit === "piece"
          ? Math.ceil(ingredient.missingQuantity)
          : ingredient.missingQuantity,
    }));
}

export function buildFoodRows(items: FoodToAdd[], storageLocations: StorageLocation[]): FoodRow[] {
  return items.map((item) => {
    const display = item.quantity === null ? null : quantityText(item.quantity, item.food.baseUnit);
    return {
      key: item.key,
      isSelected: true,
      quantityText: display?.text ?? "",
      unitSymbol: display?.unitSymbol ?? displayUnits[item.food.baseUnit][0].symbol,
      storageLocationId: defaultStorageLocationId(item.food.category, storageLocations),
      expirationDate: "",
    };
  });
}
