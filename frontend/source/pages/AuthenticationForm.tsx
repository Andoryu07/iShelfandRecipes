import { Alert, Button, Divider, Link, TextField, Typography } from "@mui/material";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

export function AuthenticationForm({ mode }: { mode: "logIn" | "register" }) {
  const { logIn, register, startAsGuest } = useAuthentication();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegistration = mode === "register";
  const redirectState: unknown = useLocation().state;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      if (isRegistration) {
        await register(email, password, displayName);
      } else {
        await logIn(email, password);
      }
    } catch (error) {
      setErrorMessage(
        describeError(error, {
          401: texts.authentication.incorrectCredentials,
          409: texts.authentication.emailAlreadyRegistered,
        }),
      );
      setIsSubmitting(false);
    }
  }

  async function handleGuest() {
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await startAsGuest();
    } catch (error) {
      setErrorMessage(describeError(error, { 429: texts.guest.tooManyGuests }));
      setIsSubmitting(false);
    }
  }

  return (
    <main className="centeredPage">
      <Link component={RouterLink} to="/" underline="none" variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
        {texts.applicationName}
      </Link>
      <Typography variant="h6" component="h2">
        {isRegistration ? texts.authentication.registerTitle : texts.authentication.logInTitle}
      </Typography>
      <form onSubmit={handleSubmit}>
        {isRegistration && (
          <TextField
            label={texts.authentication.displayName}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            autoComplete="name"
            required
          />
        )}
        <TextField
          label={texts.authentication.email}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
        <TextField
          label={texts.authentication.password}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete={isRegistration ? "new-password" : "current-password"}
          helperText={isRegistration ? texts.authentication.passwordHint : undefined}
          slotProps={{ htmlInput: { minLength: isRegistration ? 8 : undefined, maxLength: 128 } }}
          required
        />
        {!isRegistration && (
          <Link component={RouterLink} to="/forgot-password" variant="body2" sx={{ display: "block", mt: 1 }}>
            {texts.authentication.forgotPassword}
          </Link>
        )}
        {errorMessage && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {errorMessage}
          </Alert>
        )}
        <Button
          type="submit"
          variant="contained"
          size="large"
          fullWidth
          sx={{ mt: 2 }}
          disabled={isSubmitting}
        >
          {isRegistration ? texts.authentication.register : texts.authentication.logIn}
        </Button>
      </form>
      {isRegistration && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: "center" }}>
          {texts.registrationConsent}{" "}
          <Link component={RouterLink} to="/privacy">
            {texts.registrationConsentLink}
          </Link>
        </Typography>
      )}
      <Link
        component={RouterLink}
        to={isRegistration ? "/login" : "/register"}
        state={redirectState}
        sx={{ mt: 3, textAlign: "center" }}
      >
        {isRegistration ? texts.authentication.alreadyHaveAccount : texts.authentication.noAccountYet}
      </Link>
      <Divider sx={{ my: 3 }}>{texts.common.or}</Divider>
      <Button variant="outlined" size="large" fullWidth onClick={handleGuest} disabled={isSubmitting}>
        {texts.guest.tryWithoutAccount}
      </Button>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: "center" }}>
        {texts.guest.tryHint}
      </Typography>
      <Link component={RouterLink} to="/" variant="body2" sx={{ mt: 3, textAlign: "center" }}>
        {texts.authentication.aboutApplication}
      </Link>
    </main>
  );
}
