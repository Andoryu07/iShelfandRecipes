import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  List,
  ListItem,
  ListItemText,
  Snackbar,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import type { TourRequestState } from "../tour/TourEntryPoints";
import { resetTips, seenTours } from "../tour/tourStorage";
import { tourIds, tourPath } from "../tour/tours";
import { texts } from "../translations/cs";

export function HelpPage() {
  const navigate = useNavigate();
  const { status } = useAuthentication();
  const isSignedIn = status === "signedIn";
  const [seen, setSeen] = useState(seenTours);
  const [isResetDone, setIsResetDone] = useState(false);

  return (
    <main className="page">
      <Button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}>
        {texts.help.back}
      </Button>
      <Typography variant="h4" component="h1" sx={{ mt: 1 }}>
        {texts.help.title}
      </Typography>

      <section className="section">
        <Typography variant="h6" component="h2">
          {texts.help.toursTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          {isSignedIn ? texts.help.toursIntro : texts.help.signInToStart}
        </Typography>
        {isSignedIn ? (
          <Card>
            <List disablePadding>
              {tourIds.map((tourId, index) => {
                const path = tourPath(tourId);
                return (
                  <ListItem
                    key={tourId}
                    divider={index < tourIds.length - 1}
                    secondaryAction={
                      path && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            navigate(path, { state: { startTour: tourId } satisfies TourRequestState })
                          }
                        >
                          {texts.help.start}
                        </Button>
                      )
                    }
                  >
                    <ListItemText
                      primary={
                        <>
                          {texts.tour.names[tourId]}
                          {seen.includes(tourId) && (
                            <CheckCircleRoundedIcon
                              color="success"
                              aria-label={texts.help.seen}
                              sx={{ fontSize: 18, ml: 0.75, verticalAlign: "text-bottom" }}
                            />
                          )}
                        </>
                      }
                      secondary={path ? undefined : texts.help.recipeDetailHint}
                      sx={{ pr: path ? 10 : 0 }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </Card>
        ) : (
          <Button variant="contained" component={RouterLink} to="/login">
            {texts.help.openApplication}
          </Button>
        )}
      </section>

      <section className="section">
        <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
          {texts.help.howToTitle}
        </Typography>
        {texts.help.howTo.map((item) => (
          <Accordion
            key={item.question}
            disableGutters
            variant="outlined"
            sx={{ "&:before": { display: "none" } }}
          >
            <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
              <Typography sx={{ fontWeight: 600 }}>{item.question}</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography color="text.secondary">{item.answer}</Typography>
            </AccordionDetails>
          </Accordion>
        ))}
      </section>

      <section className="section">
        <Typography variant="h6" component="h2">
          {texts.help.resetTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          {texts.help.resetText}
        </Typography>
        <Button
          variant="outlined"
          onClick={() => {
            resetTips();
            setSeen([]);
            setIsResetDone(true);
          }}
        >
          {texts.help.reset}
        </Button>
      </section>
      <Snackbar
        open={isResetDone}
        autoHideDuration={3000}
        onClose={() => setIsResetDone(false)}
        message={texts.help.resetDone}
      />
    </main>
  );
}
