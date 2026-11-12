import type { FoodCategory, SaveReceiptItem, ScannedReceiptItem } from "../api/types";
import { baseUnitOf, isNewFood, newFoodRequest, type FoodChoice } from "../stock/FoodPicker";
import {
  bestDisplayUnit,
  findDisplayUnit,
  fromBaseQuantity,
  parseDecimal,
  toBaseQuantity,
} from "../stock/quantities";
import { texts } from "../translations/cs";
import { moneyText, parseMoney } from "./money";

export interface ReviewItem {
  key: string;
  originalText: string;
  name: string;
  category: FoodCategory;
  food: FoodChoice | null;
  quantityText: string;
  unitSymbol: string;
  priceText: string;
  discount: number;
  addToStock: boolean;
  storageLocationId: number | null;
  expirationDate: string;
  initial: { name: string; foodKey: string; quantityText: string; unitSymbol: string; priceText: string };
}

let nextKey = 0;

function foodKey(food: FoodChoice | null): string {
  if (food === null) {
    return "none";
  }
  return isNewFood(food) ? `new:${food.newFoodName}:${food.baseUnit}` : `food:${food.id}`;
}

function quantityFields(
  quantity: number | null,
  food: FoodChoice | null,
  scannedUnit: ScannedReceiptItem["unit"],
) {
  const baseUnit = baseUnitOf(food);
  if (quantity === null || baseUnit === null || scannedUnit !== baseUnit) {
    return { quantityText: "", unitSymbol: baseUnit ? bestDisplayUnit(0, baseUnit).symbol : "" };
  }
  const unit = bestDisplayUnit(quantity, baseUnit);
  return {
    quantityText: String(fromBaseQuantity(quantity, unit)).replace(".", ","),
    unitSymbol: unit.symbol,
  };
}

export function createReviewItem(scanned: ScannedReceiptItem, storageLocationId: number | null): ReviewItem {
  const food: FoodChoice | null =
    scanned.suggestedFood ??
    (scanned.isFood
      ? {
          newFoodName: scanned.name,
          baseUnit: scanned.unit ?? "piece",
          category: scanned.category,
          genericName: scanned.genericName ?? "",
        }
      : null);
  const quantity = quantityFields(scanned.quantity, food, scanned.unit);
  const priceText = moneyText(scanned.price);
  return {
    key: `item${nextKey++}`,
    originalText: scanned.originalText,
    name: scanned.name,
    category: scanned.category,
    food,
    ...quantity,
    priceText,
    discount: scanned.discount,
    addToStock: scanned.isFood && scanned.price > 0 && food !== null,
    storageLocationId,
    expirationDate: "",
    initial: { name: scanned.name, foodKey: foodKey(food), priceText, ...quantity },
  };
}

export function createManualItem(storageLocationId: number | null): ReviewItem {
  const item = createReviewItem(
    {
      originalText: texts.receipts.newItemText,
      name: "",
      genericName: null,
      category: "other",
      isFood: false,
      quantity: null,
      unit: null,
      price: 0,
      discount: 0,
      suggestedFood: null,
    },
    storageLocationId,
  );
  return { ...item, priceText: "", initial: { ...item.initial, priceText: "" } };
}

export function isCorrected(item: ReviewItem): boolean {
  const { initial } = item;
  return (
    item.name.trim() !== initial.name ||
    foodKey(item.food) !== initial.foodKey ||
    item.quantityText.trim() !== initial.quantityText ||
    item.unitSymbol !== initial.unitSymbol ||
    item.priceText.trim() !== initial.priceText
  );
}

export function itemPrice(item: ReviewItem): number | null {
  return parseMoney(item.priceText);
}

export interface BuildResult {
  items: SaveReceiptItem[];
  errors: Record<string, string>;
}

export function buildSaveItems(items: ReviewItem[]): BuildResult {
  const errors: Record<string, string> = {};
  const saveItems: SaveReceiptItem[] = [];
  for (const item of items) {
    const price = itemPrice(item);
    const baseUnit = baseUnitOf(item.food);
    const quantityValue = item.quantityText.trim() ? parseDecimal(item.quantityText) : null;
    const quantity =
      quantityValue !== null && quantityValue > 0 && baseUnit
        ? toBaseQuantity(quantityValue, findDisplayUnit(baseUnit, item.unitSymbol))
        : null;
    if (price === null) {
      errors[item.key] = texts.receipts.invalidPrice;
    } else if (item.addToStock && item.food === null) {
      errors[item.key] = texts.receipts.needsFood;
    } else if (item.addToStock && quantity === null) {
      errors[item.key] = texts.receipts.needsQuantity;
    }
    const name =
      item.name.trim() || (item.food ? (isNewFood(item.food) ? item.food.newFoodName : item.food.name) : "");
    saveItems.push({
      originalText: item.originalText,
      name: name || item.originalText,
      category: item.food ? item.food.category : item.category,
      quantity,
      unit: quantity !== null ? baseUnit : null,
      price: price ?? 0,
      discount: item.discount,
      correctedByUser: isCorrected(item),
      foodId: item.food && !isNewFood(item.food) ? item.food.id : null,
      newFood: isNewFood(item.food) ? newFoodRequest(item.food) : null,
      addToStock: item.addToStock,
      storageLocationId: item.addToStock ? item.storageLocationId : null,
      expirationDate: item.addToStock && item.expirationDate ? item.expirationDate : null,
    });
  }
  return { items: saveItems, errors };
}
