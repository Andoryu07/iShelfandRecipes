import { beforeEach, describe, expect, it } from "vitest";
import {
  answerTourOffer,
  dismissTourHint,
  isTourHintDismissed,
  markTourSeen,
  resetTips,
  seenTours,
  tourOfferAnswer,
} from "./tourStorage";
import { availableSteps, tourForPath, tourIds, tourPath, tours } from "./tours";

describe("tourForPath", () => {
  it("finds the tour of each screen", () => {
    expect(tourForPath("/overview")).toBe("overview");
    expect(tourForPath("/stock")).toBe("stock");
    expect(tourForPath("/shopping-list")).toBe("shoppingList");
    expect(tourForPath("/recipes")).toBe("recipes");
    expect(tourForPath("/recipes/12")).toBe("recipeDetail");
    expect(tourForPath("/profile")).toBeNull();
  });

  it("maps every tour with a path back to it", () => {
    for (const tourId of tourIds) {
      const path = tourPath(tourId);
      if (path) {
        expect(tourForPath(path)).toBe(tourId);
      }
    }
  });
});

describe("availableSteps", () => {
  it("skips steps whose button is not on the screen and keeps steps without a target", () => {
    const steps = availableSteps(tours.receipts, (target) => target !== "receiptsList");
    expect(steps.map((step) => step.target)).toEqual(["receiptsViewSwitch", "receiptsScan", undefined]);
  });

  it("gives every tour a title and text for each step", () => {
    for (const tourId of tourIds) {
      expect(tours[tourId].length).toBeGreaterThan(0);
      for (const step of tours[tourId]) {
        expect(step.title.length).toBeGreaterThan(0);
        expect(step.text.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("tour storage", () => {
  beforeEach(() => localStorage.clear());

  it("remembers seen tours, dismissed hints and the offer answer until the tips are reset", () => {
    markTourSeen("stock");
    markTourSeen("stock");
    dismissTourHint("recipes");
    answerTourOffer("declined");
    localStorage.setItem("iShelf.swipeHintSeen", "seen");

    expect(seenTours()).toEqual(["stock"]);
    expect(isTourHintDismissed("recipes")).toBe(true);
    expect(tourOfferAnswer()).toBe("declined");

    resetTips();
    expect(seenTours()).toEqual([]);
    expect(isTourHintDismissed("recipes")).toBe(false);
    expect(tourOfferAnswer()).toBeNull();
    expect(localStorage.getItem("iShelf.swipeHintSeen")).toBeNull();
  });

  it("ignores broken stored values", () => {
    localStorage.setItem("iShelf.seenTours", "{oops");
    expect(seenTours()).toEqual([]);
  });
});
