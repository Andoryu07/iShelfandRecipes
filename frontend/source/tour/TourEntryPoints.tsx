import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { texts } from "../translations/cs";
import { useTour } from "./TourContext";
import {
  answerTourOffer,
  dismissTourHint,
  isTourHintDismissed,
  seenTours,
  tourOfferAnswer,
} from "./tourStorage";
import { tourForPath, type TourId } from "./tours";

export interface TourRequestState {
  startTour?: TourId;
}

export function HelpButton() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { startTour } = useTour();
  const tourId = tourForPath(pathname);
  return (
    <IconButton
      aria-label={texts.tour.helpButton}
      onClick={() => (tourId ? startTour(tourId) : navigate("/help"))}
      data-tour="helpButton"
    >
      <HelpOutlineRoundedIcon />
    </IconButton>
  );
}

export function TourOffer() {
  const { pathname } = useLocation();
  const { startTour } = useTour();
  const [isOpen, setIsOpen] = useState(() => tourOfferAnswer() === null);
  if (!isOpen || pathname !== "/overview") {
    return null;
  }

  function answer(isAccepted: boolean) {
    answerTourOffer(isAccepted ? "accepted" : "declined");
    setIsOpen(false);
    if (isAccepted) {
      startTour("overview");
    }
  }

  return (
    <Dialog open onClose={() => answer(false)} aria-labelledby="tourOfferTitle">
      <DialogTitle id="tourOfferTitle">👋 {texts.tour.offerTitle}</DialogTitle>
      <DialogContent>
        <DialogContentText>{texts.tour.offerText}</DialogContentText>
        <DialogContentText variant="body2" sx={{ mt: 1.5 }}>
          {texts.tour.offerHint}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => answer(false)}>{texts.tour.offerLater}</Button>
        <Button variant="contained" onClick={() => answer(true)} autoFocus>
          {texts.tour.offerShow}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function TourHint() {
  const { pathname } = useLocation();
  const { startTour, activeTourId } = useTour();
  const tourId = tourForPath(pathname);
  const [hiddenTourIds, setHiddenTourIds] = useState<TourId[]>([]);
  if (
    !tourId ||
    tourId === "overview" ||
    activeTourId !== null ||
    tourOfferAnswer() !== "accepted" ||
    hiddenTourIds.includes(tourId) ||
    seenTours().includes(tourId) ||
    isTourHintDismissed(tourId)
  ) {
    return null;
  }

  function hide(id: TourId) {
    dismissTourHint(id);
    setHiddenTourIds((current) => [...current, id]);
  }

  return (
    <Alert
      severity="info"
      icon={<HelpOutlineRoundedIcon />}
      onClose={() => hide(tourId)}
      sx={{ mb: 1.5, alignItems: "center" }}
    >
      {texts.tour.hintText}{" "}
      <Button
        size="small"
        onClick={() => {
          hide(tourId);
          startTour(tourId);
        }}
        sx={{ ml: -0.5 }}
      >
        {texts.tour.hintShow}
      </Button>
    </Alert>
  );
}

export function useRequestedTour() {
  const location = useLocation();
  const navigate = useNavigate();
  const { startTour } = useTour();
  const requestedTour = (location.state as TourRequestState | null)?.startTour;

  useEffect(() => {
    if (!requestedTour) {
      return;
    }
    navigate(`${location.pathname}${location.search}`, { replace: true, state: null });
    startTour(requestedTour);
  }, [location.pathname, location.search, navigate, requestedTour, startTour]);
}
