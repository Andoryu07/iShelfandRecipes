import { Alert, Button, Link, TextField, Typography } from "@mui/material";
import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

export function AuthenticationForm({ mode }: { mode: "logIn" | "register" }) {
  const { logIn, register } = useAuthentication();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegistration = mode === "register";

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

  return (
    <main className="centeredPage">
      <Typography variant="h4" component="h1" color="primary" gutterBottom>
        {texts.applicationName}
      </Typography>
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
      <Link
        component={RouterLink}
        to={isRegistration ? "/login" : "/register"}
        sx={{ mt: 3, textAlign: "center" }}
      >
        {isRegistration ? texts.authentication.alreadyHaveAccount : texts.authentication.noAccountYet}
      </Link>
    </main>
  );
}
