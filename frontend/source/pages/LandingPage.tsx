import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

const contentWidth = 1080;
const heroColors = { light: "#2e7d4f", dark: "#1b5534" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box component="section" sx={{ maxWidth: contentWidth, mx: "auto", px: 2, py: { xs: 5, md: 7 } }}>
      <Typography
        variant="h4"
        component="h2"
        sx={{ fontWeight: 750, mb: 3, textAlign: "center", fontSize: { xs: "1.75rem", md: "2.125rem" } }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function StartButtons({ onGuest, isStarting }: { onGuest: () => void; isStarting: boolean }) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ justifyContent: "center" }}>
      <Button variant="contained" size="large" onClick={onGuest} disabled={isStarting}>
        {texts.landing.tryWithoutAccount}
      </Button>
      <Button variant="outlined" size="large" component={RouterLink} to="/register">
        {texts.landing.register}
      </Button>
      <Button size="large" component={RouterLink} to="/login">
        {texts.landing.logIn}
      </Button>
    </Stack>
  );
}

export function LandingPage() {
  const { startAsGuest } = useAuthentication();
  const [isStarting, setIsStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = texts.landing.pageTitle;
    return () => {
      document.title = previousTitle;
    };
  }, []);

  async function startGuest() {
    setErrorMessage(null);
    setIsStarting(true);
    try {
      await startAsGuest();
    } catch (error) {
      setErrorMessage(describeError(error, { 429: texts.guest.tooManyGuests }));
      setIsStarting(false);
    }
  }

  const errorAlert = errorMessage && (
    <Alert severity="error" sx={{ mt: 2, maxWidth: 480, mx: "auto" }}>
      {errorMessage}
    </Alert>
  );

  return (
    <Box component="main" sx={{ bgcolor: "background.default", color: "text.primary" }}>
      <Box
        sx={{
          background: `linear-gradient(160deg, ${heroColors.light} 0%, ${heroColors.dark} 100%)`,
          color: "#ffffff",
          pt: "calc(40px + env(safe-area-inset-top))",
          pb: { xs: 5, md: 8 },
          px: 2,
        }}
      >
        <Box sx={{ maxWidth: contentWidth, mx: "auto", textAlign: "center" }}>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "center", mb: 4 }}>
            <Box
              component="img"
              src="/icons/icon-192.png"
              alt=""
              sx={{ width: 48, height: 48, borderRadius: 3 }}
            />
            <Typography variant="h6" component="p" sx={{ fontWeight: 750 }}>
              {texts.applicationName}
            </Typography>
          </Stack>
          <Typography
            variant="h3"
            component="h1"
            sx={{ fontWeight: 800, fontSize: { xs: "2rem", md: "3rem" }, lineHeight: 1.15, mb: 2 }}
          >
            {texts.landing.headline}
          </Typography>
          <Typography
            sx={{ fontSize: { xs: "1.05rem", md: "1.25rem" }, opacity: 0.92, maxWidth: 640, mx: "auto" }}
          >
            {texts.landing.subtitle}
          </Typography>
          <Box
            sx={{
              mt: 4,
              "& .MuiButton-contained": { bgcolor: "#ffffff", color: heroColors.light },
              "& .MuiButton-outlined": { borderColor: "rgba(255,255,255,0.7)", color: "inherit" },
              "& .MuiButton-text": { color: "inherit" },
            }}
          >
            <StartButtons onGuest={() => void startGuest()} isStarting={isStarting} />
          </Box>
          {errorAlert}
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.85 }}>
            {texts.landing.heroNote}
          </Typography>
        </Box>
      </Box>

      <Section title={texts.landing.featuresTitle}>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          }}
        >
          {texts.landing.features.map((feature) => (
            <Card key={feature.title}>
              <CardContent sx={{ display: "flex", flexDirection: { xs: "row", sm: "column" }, gap: 1.5 }}>
                <Avatar sx={{ bgcolor: "action.hover", width: 48, height: 48, fontSize: 26, flexShrink: 0 }}>
                  {feature.icon}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h3" sx={{ mb: 0.5, lineHeight: 1.3 }}>
                    {feature.title}
                  </Typography>
                  <Typography color="text.secondary">{feature.text}</Typography>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Section>

      <Box sx={{ bgcolor: "action.hover" }}>
        <Section title={texts.landing.stepsTitle}>
          <Box
            component="ol"
            sx={{
              display: "grid",
              gap: 3,
              gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
              listStyle: "none",
              p: 0,
              m: 0,
            }}
          >
            {texts.landing.steps.map((step, index) => (
              <Stack component="li" key={step.title} direction="row" spacing={2}>
                <Avatar sx={{ bgcolor: "primary.main", color: "primary.contrastText", fontWeight: 750 }}>
                  {index + 1}
                </Avatar>
                <Box>
                  <Typography variant="h6" component="h3">
                    {step.title}
                  </Typography>
                  <Typography color="text.secondary">{step.text}</Typography>
                </Box>
              </Stack>
            ))}
          </Box>
        </Section>
      </Box>

      <Section title={texts.landing.screenshotsTitle}>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            overflowX: "auto",
            scrollSnapType: "x mandatory",
            mx: -2,
            px: 2,
            pb: 1,
            justifyContent: { lg: "center" },
          }}
        >
          {texts.landing.screenshots.map((screenshot) => (
            <Box
              component="figure"
              key={screenshot.file}
              sx={{ m: 0, flex: "0 0 auto", width: 220, scrollSnapAlign: "center" }}
            >
              <Box
                component="img"
                src={`/landing/${screenshot.file}.webp`}
                alt={texts.landing.screenshotAlt(screenshot.caption)}
                loading="lazy"
                width={220}
                height={452}
                sx={{
                  display: "block",
                  width: 220,
                  height: "auto",
                  boxSizing: "border-box",
                  p: "7px",
                  bgcolor: "grey.900",
                  borderRadius: "20px",
                  boxShadow: 4,
                }}
              />
              <Typography component="figcaption" variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {screenshot.caption}
              </Typography>
            </Box>
          ))}
        </Box>
      </Section>

      <Section title={texts.landing.questionsTitle}>
        <Box sx={{ maxWidth: 720, mx: "auto" }}>
          {texts.landing.questions.map((item) => (
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
          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Button component={RouterLink} to="/help">
              {texts.landing.moreHelp}
            </Button>
          </Box>
        </Box>
      </Section>

      <Box sx={{ bgcolor: "action.hover", textAlign: "center", px: 2, py: { xs: 5, md: 7 } }}>
        <Typography
          variant="h4"
          component="h2"
          sx={{ fontWeight: 750, mb: 1, fontSize: { xs: "1.75rem", md: "2.125rem" } }}
        >
          {texts.landing.closingTitle}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          {texts.landing.closingText}
        </Typography>
        <StartButtons onGuest={() => void startGuest()} isStarting={isStarting} />
        {errorAlert}
      </Box>

      <Box
        component="footer"
        sx={{ px: 2, py: 4, pb: "calc(32px + env(safe-area-inset-bottom))", textAlign: "center" }}
      >
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={{ xs: 1, sm: 3 }}
          sx={{ justifyContent: "center", alignItems: "center" }}
        >
          <Typography variant="body2" color="text.secondary">
            {texts.landing.footerContact}:{" "}
            <Link href={`mailto:${texts.profile.contactEmail}`}>{texts.profile.contactEmail}</Link>
          </Typography>
          <Link component={RouterLink} to="/privacy" variant="body2">
            {texts.landing.footerPrivacy}
          </Link>
          <Link href="https://world.openfoodfacts.org" target="_blank" rel="noopener" variant="body2">
            {texts.landing.footerOpenFoodFacts}
          </Link>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          © {new Date().getFullYear()} {texts.applicationName}
        </Typography>
      </Box>
    </Box>
  );
}
