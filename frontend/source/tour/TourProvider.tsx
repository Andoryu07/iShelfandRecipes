import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router";
import { TourContext } from "./TourContext";
import { TourOverlay } from "./TourOverlay";
import { markTourSeen } from "./tourStorage";
import { availableSteps, findTourTarget, tours, type TourId, type TourStep } from "./tours";

interface ActiveTour {
  tourId: TourId;
  pathname: string;
  steps: TourStep[];
  index: number;
}

const targetWaitAttempts = 14;
const targetWaitMilliseconds = 150;

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function TourProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [activeTour, setActiveTour] = useState<ActiveTour | null>(null);
  const startCounter = useRef(0);

  const startTour = useCallback(async (tourId: TourId) => {
    const startNumber = ++startCounter.current;
    setActiveTour(null);
    const tourSteps = tours[tourId];
    const targets = tourSteps.flatMap((step) => (step.target ? [step.target] : []));
    let previousFoundCount = -1;
    for (let attempt = 0; attempt < targetWaitAttempts; attempt += 1) {
      const foundCount = targets.filter((target) => findTourTarget(target) !== null).length;
      if (foundCount === targets.length || (foundCount > 0 && foundCount === previousFoundCount)) {
        break;
      }
      previousFoundCount = foundCount;
      await wait(targetWaitMilliseconds);
    }
    if (startNumber !== startCounter.current) {
      return;
    }
    const steps = availableSteps(tourSteps, (target) => findTourTarget(target) !== null);
    if (steps.length === 0) {
      return;
    }
    markTourSeen(tourId);
    setActiveTour({ tourId, pathname: window.location.pathname, steps, index: 0 });
  }, []);

  const close = useCallback(() => {
    startCounter.current += 1;
    setActiveTour(null);
  }, []);

  const next = useCallback(() => {
    setActiveTour((current) =>
      current && current.index < current.steps.length - 1 ? { ...current, index: current.index + 1 } : null,
    );
  }, []);

  const back = useCallback(() => {
    setActiveTour((current) => (current ? { ...current, index: Math.max(0, current.index - 1) } : null));
  }, []);

  const visibleTour = activeTour && activeTour.pathname === pathname ? activeTour : null;
  const value = useMemo(
    () => ({
      activeTourId: visibleTour?.tourId ?? null,
      startTour: (tourId: TourId) => void startTour(tourId),
    }),
    [startTour, visibleTour?.tourId],
  );

  return (
    <TourContext.Provider value={value}>
      {children}
      {visibleTour && (
        <TourOverlay
          step={visibleTour.steps[visibleTour.index]}
          stepNumber={visibleTour.index + 1}
          stepCount={visibleTour.steps.length}
          onNext={next}
          onBack={back}
          onClose={close}
        />
      )}
    </TourContext.Provider>
  );
}
