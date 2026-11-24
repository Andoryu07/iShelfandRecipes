import { texts } from "../translations/cs";

export type TourId = keyof typeof texts.tour.steps;

export interface TourStep {
  target?: string;
  title: string;
  text: string;
}

const steps = texts.tour.steps;

export const tours: Record<TourId, TourStep[]> = {
  overview: [
    steps.overview.welcome,
    { target: "overviewScan", ...steps.overview.scan },
    { target: "overviewAdd", ...steps.overview.add },
    { target: "overviewExpiring", ...steps.overview.expiring },
    { target: "overviewSpending", ...steps.overview.spending },
    { target: "overviewCookNow", ...steps.overview.cookNow },
    { target: "householdSwitcher", ...steps.overview.householdSwitcher },
    { target: "shoppingCart", ...steps.overview.shoppingCart },
    { target: "helpButton", ...steps.overview.help },
    { target: "profileButton", ...steps.overview.profile },
    { target: "navigation", ...steps.overview.navigation },
  ],
  stock: [
    { target: "stockSearch", ...steps.stock.search },
    { target: "stockLocations", ...steps.stock.locations },
    { target: "stockList", ...steps.stock.list },
    { target: "stockList", ...steps.stock.swipe },
    { target: "stockAdd", ...steps.stock.add },
  ],
  receipts: [
    { target: "receiptsViewSwitch", ...steps.receipts.switch },
    { target: "receiptsScan", ...steps.receipts.scan },
    steps.receipts.review,
    { target: "receiptsList", ...steps.receipts.list },
  ],
  recipes: [
    { target: "recipesSearch", ...steps.recipes.search },
    { target: "recipesHistory", ...steps.recipes.history },
    { target: "recipesFilters", ...steps.recipes.filters },
    { target: "recipesMoreFilters", ...steps.recipes.moreFilters },
    { target: "recipesCard", ...steps.recipes.card },
    { target: "recipesAdd", ...steps.recipes.add },
  ],
  recipeDetail: [
    { target: "recipeMissing", ...steps.recipeDetail.missing },
    { target: "recipeServings", ...steps.recipeDetail.servings },
    { target: "recipeCookingMode", ...steps.recipeDetail.cookingMode },
    { target: "recipeHistory", ...steps.recipeDetail.history },
    { target: "recipeActions", ...steps.recipeDetail.actions },
    { target: "recipeMenu", ...steps.recipeDetail.menu },
  ],
  household: [
    { target: "householdInvite", ...steps.household.invite },
    { target: "householdMembers", ...steps.household.members },
    { target: "householdLocations", ...steps.household.locations },
    { target: "householdExport", ...steps.household.export },
  ],
  shoppingList: [
    { target: "shoppingTabs", ...steps.shoppingList.tabs },
    { target: "shoppingAdd", ...steps.shoppingList.add },
    { target: "shoppingItems", ...steps.shoppingList.items },
    { target: "shoppingChecked", ...steps.shoppingList.checked },
  ],
};

export const tourIds = Object.keys(tours) as TourId[];

const tourPaths: Record<TourId, string | null> = {
  overview: "/overview",
  stock: "/stock",
  receipts: "/receipts",
  recipes: "/recipes",
  recipeDetail: null,
  household: "/household",
  shoppingList: "/shopping-list",
};

export function tourPath(tourId: TourId): string | null {
  return tourPaths[tourId];
}

export function tourForPath(pathname: string): TourId | null {
  if (/^\/recipes\/\d+$/.test(pathname)) {
    return "recipeDetail";
  }
  return tourIds.find((tourId) => tourPaths[tourId] === pathname) ?? null;
}

export function availableSteps(
  tourSteps: TourStep[],
  isTargetVisible: (target: string) => boolean,
): TourStep[] {
  return tourSteps.filter((step) => step.target === undefined || isTargetVisible(step.target));
}

export function findTourTarget(target: string): HTMLElement | null {
  for (const element of document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`)) {
    const rectangle = element.getBoundingClientRect();
    if (rectangle.width > 0 && rectangle.height > 0) {
      return element;
    }
  }
  return null;
}
