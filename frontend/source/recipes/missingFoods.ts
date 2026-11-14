import type {
  FoodCategory,
  IngredientAvailability,
  StorageLocation,
  StorageLocationKind,
} from "../api/types";
import { bestDisplayUnit, fromBaseQuantity } from "../stock/quantities";

export interface MissingFoodRow {
  ingredientId: number;
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

export function buildMissingFoodRows(
  ingredients: IngredientAvailability[],
  storageLocations: StorageLocation[],
): MissingFoodRow[] {
  return ingredients
    .filter((ingredient) => !ingredient.isOptional && ingredient.missingQuantity > 0)
    .map((ingredient) => {
      const { baseUnit } = ingredient.food;
      const quantity =
        baseUnit === "piece" ? Math.ceil(ingredient.missingQuantity) : ingredient.missingQuantity;
      const unit = bestDisplayUnit(quantity, baseUnit);
      return {
        ingredientId: ingredient.ingredientId,
        isSelected: true,
        quantityText: String(fromBaseQuantity(quantity, unit)).replace(".", ","),
        unitSymbol: unit.symbol,
        storageLocationId: defaultStorageLocationId(ingredient.food.category, storageLocations),
        expirationDate: "",
      };
    });
}
