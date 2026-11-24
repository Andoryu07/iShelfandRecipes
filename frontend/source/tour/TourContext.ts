import { createContext, useContext } from "react";
import type { TourId } from "./tours";

export interface TourState {
  activeTourId: TourId | null;
  startTour: (tourId: TourId) => void;
}

export const TourContext = createContext<TourState>({ activeTourId: null, startTour: () => undefined });

export function useTour(): TourState {
  return useContext(TourContext);
}
