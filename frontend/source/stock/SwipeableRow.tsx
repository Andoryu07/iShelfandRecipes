import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import RestaurantRoundedIcon from "@mui/icons-material/RestaurantRounded";
import { Box, Typography } from "@mui/material";
import { useRef, useState, type PointerEvent, type ReactNode } from "react";
import { vibrate } from "../components/haptics";

interface SwipeableRowProps {
  children: ReactNode;
  rightLabel: string;
  leftLabel: string;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
}

const startDistance = 12;
const actionShare = 0.35;

export function SwipeableRow({
  children,
  rightLabel,
  leftLabel,
  onSwipeRight,
  onSwipeLeft,
}: SwipeableRowProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [rowWidth, setRowWidth] = useState(1);
  const gesture = useRef<{
    x: number;
    y: number;
    width: number;
    direction: "none" | "horizontal" | "vertical";
  } | null>(null);
  const crossedRef = useRef(false);
  const suppressClickRef = useRef(false);

  function reset() {
    gesture.current = null;
    setIsDragging(false);
    setOffset(0);
    crossedRef.current = false;
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }
    gesture.current = {
      x: event.clientX,
      y: event.clientY,
      width: event.currentTarget.offsetWidth,
      direction: "none",
    };
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current) {
      return;
    }
    const deltaX = event.clientX - current.x;
    const deltaY = event.clientY - current.y;
    if (current.direction === "none") {
      if (Math.abs(deltaX) < startDistance && Math.abs(deltaY) < startDistance) {
        return;
      }
      current.direction = Math.abs(deltaX) > Math.abs(deltaY) ? "horizontal" : "vertical";
      if (current.direction === "horizontal") {
        event.currentTarget.setPointerCapture(event.pointerId);
        setRowWidth(current.width);
        setIsDragging(true);
      }
    }
    if (current.direction !== "horizontal") {
      return;
    }
    setOffset(deltaX);
    const crossed = Math.abs(deltaX) > current.width * actionShare;
    if (crossed !== crossedRef.current) {
      crossedRef.current = crossed;
      if (crossed) {
        vibrate(20);
      }
    }
  }

  function pointerUp() {
    const current = gesture.current;
    if (!current || current.direction !== "horizontal") {
      gesture.current = null;
      return;
    }
    suppressClickRef.current = true;
    window.setTimeout(() => (suppressClickRef.current = false), 50);
    const passed = Math.abs(offset) > current.width * actionShare;
    if (passed) {
      const action = offset > 0 ? onSwipeRight : onSwipeLeft;
      setIsDragging(false);
      setOffset(offset > 0 ? current.width : -current.width);
      gesture.current = null;
      window.setTimeout(() => {
        action();
        setOffset(0);
        crossedRef.current = false;
      }, 180);
    } else {
      reset();
    }
  }

  const showsRight = offset > 0;
  const passed = Math.abs(offset) > rowWidth * actionShare;
  return (
    <Box sx={{ position: "relative", overflow: "hidden" }}>
      {offset !== 0 && (
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: showsRight ? "flex-start" : "flex-end",
            gap: 1,
            px: 2.5,
            color: "common.white",
            bgcolor: showsRight ? "success.main" : "warning.main",
            opacity: passed || !isDragging ? 1 : 0.75,
          }}
        >
          {showsRight ? <RestaurantRoundedIcon /> : null}
          <Typography sx={{ fontWeight: 700 }}>{showsRight ? rightLabel : leftLabel}</Typography>
          {showsRight ? null : <DeleteOutlineRoundedIcon />}
        </Box>
      )}
      <Box
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={reset}
        onClickCapture={(event) => {
          if (suppressClickRef.current) {
            event.stopPropagation();
            event.preventDefault();
          }
        }}
        sx={{
          position: "relative",
          bgcolor: "background.paper",
          touchAction: "pan-y",
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.18s ease-out",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
