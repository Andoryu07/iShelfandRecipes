import type { TourId } from "./tours";

const seenToursKey = "iShelf.seenTours";
const dismissedHintsKey = "iShelf.dismissedTourHints";
const offerAnswerKey = "iShelf.tourOfferAnswer";
const swipeHintKey = "iShelf.swipeHintSeen";
const otherTipKeys = [swipeHintKey, "iShelf.hidePrefillWarning"];

function readList(key: string): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function addToList(key: string, item: string) {
  try {
    const list = readList(key);
    if (!list.includes(item)) {
      localStorage.setItem(key, JSON.stringify([...list, item]));
    }
  } catch {
    // Without storage the tips simply show again next time.
  }
}

export function seenTours(): TourId[] {
  return readList(seenToursKey) as TourId[];
}

export function markTourSeen(tourId: TourId) {
  addToList(seenToursKey, tourId);
  if (tourId === "stock") {
    try {
      localStorage.setItem(swipeHintKey, "seen");
    } catch {
      // The swipe tip simply stays visible.
    }
  }
}

export function isTourHintDismissed(tourId: TourId): boolean {
  return readList(dismissedHintsKey).includes(tourId);
}

export function dismissTourHint(tourId: TourId) {
  addToList(dismissedHintsKey, tourId);
}

export type TourOfferAnswer = "accepted" | "declined";

export function tourOfferAnswer(): TourOfferAnswer | null {
  try {
    const value = localStorage.getItem(offerAnswerKey);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return "declined";
  }
}

export function answerTourOffer(answer: TourOfferAnswer) {
  try {
    localStorage.setItem(offerAnswerKey, answer);
  } catch {
    // Without storage the offer cannot be remembered.
  }
}

export function resetTips() {
  for (const key of [seenToursKey, dismissedHintsKey, offerAnswerKey, ...otherTipKeys]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Nothing to reset without storage.
    }
  }
}
