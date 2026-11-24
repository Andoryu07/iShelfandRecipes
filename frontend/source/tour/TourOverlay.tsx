import { Box, Button, Paper, Portal, Stack, Typography } from "@mui/material";
import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { texts } from "../translations/cs";
import { findTourTarget, type TourStep } from "./tours";

interface TourOverlayProps {
  step: TourStep;
  stepNumber: number;
  stepCount: number;
  onNext: () => void;
  onBack: () => void;
  onClose: () => void;
}

const spotlightPadding = 6;
const bubbleGap = 12;
const neededBubbleSpace = 210;

function scrollTargetIntoView(element: HTMLElement) {
  const rectangle = element.getBoundingClientRect();
  if (rectangle.height > window.innerHeight * 0.6) {
    window.scrollBy({ top: rectangle.top - 72, behavior: "instant" });
  } else {
    element.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  }
}

function bubblePosition(rectangle: DOMRect | null): CSSProperties {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(360, viewportWidth - 32);
  if (!rectangle) {
    return { width, left: (viewportWidth - width) / 2, top: "50%", transform: "translateY(-50%)" };
  }
  const centre = rectangle.left + rectangle.width / 2;
  const left = Math.min(Math.max(centre - width / 2, 16), viewportWidth - width - 16);
  if (viewportHeight - rectangle.bottom >= neededBubbleSpace) {
    return { width, left, top: rectangle.bottom + spotlightPadding + bubbleGap };
  }
  if (rectangle.top >= neededBubbleSpace) {
    return { width, left, bottom: viewportHeight - rectangle.top + spotlightPadding + bubbleGap };
  }
  return { width, left, bottom: 16 };
}

export function TourOverlay({ step, stepNumber, stepCount, onNext, onBack, onClose }: TourOverlayProps) {
  const [measured, setMeasured] = useState<{ step: TourStep; rectangle: DOMRect } | null>(null);
  const rectangle = measured?.step === step ? measured.rectangle : null;

  useLayoutEffect(() => {
    const element = step.target ? findTourTarget(step.target) : null;
    if (!element) {
      return;
    }
    scrollTargetIntoView(element);
    const update = () => setMeasured({ step, rectangle: element.getBoundingClientRect() });
    const frame = window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      observer.disconnect();
    };
  }, [step]);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      } else if (event.key === "ArrowRight") {
        onNext();
      } else if (event.key === "ArrowLeft") {
        onBack();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onBack, onClose, onNext]);

  const isLast = stepNumber === stepCount;

  return (
    <Portal>
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: "tooltip",
          bgcolor: rectangle ? "transparent" : "rgba(0,0,0,0.55)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {rectangle && (
          <Box
            data-testid="tourSpotlight"
            sx={{
              position: "fixed",
              top: Math.max(rectangle.top - spotlightPadding, 0),
              left: Math.max(rectangle.left - spotlightPadding, 0),
              width: Math.min(rectangle.width + spotlightPadding * 2, window.innerWidth),
              height: rectangle.height + spotlightPadding * 2,
              borderRadius: "14px",
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.55)",
              outline: "2px solid rgba(255, 255, 255, 0.9)",
              pointerEvents: "none",
              transition: "all 200ms ease",
              "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            }}
          />
        )}
        <Paper
          role="dialog"
          aria-modal="true"
          aria-labelledby="tourStepTitle"
          elevation={8}
          sx={{ position: "fixed", p: 2, borderRadius: "16px", ...bubblePosition(rectangle) }}
        >
          <Typography variant="caption" color="text.secondary">
            {texts.tour.progress(stepNumber, stepCount)}
          </Typography>
          <Typography id="tourStepTitle" variant="subtitle1" component="h2" sx={{ fontWeight: 700 }}>
            {step.title}
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {step.text}
          </Typography>
          <Stack direction="row" sx={{ mt: 2, gap: 1, alignItems: "center" }}>
            <Button size="small" color="inherit" onClick={onClose}>
              {texts.tour.skip}
            </Button>
            <Box sx={{ flex: 1 }} />
            {stepNumber > 1 && (
              <Button size="small" onClick={onBack}>
                {texts.tour.back}
              </Button>
            )}
            <Button size="small" variant="contained" onClick={onNext} autoFocus>
              {isLast ? texts.tour.done : texts.tour.next}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Portal>
  );
}
