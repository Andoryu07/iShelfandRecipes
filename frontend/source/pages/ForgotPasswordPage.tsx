import { Alert, Button, Link, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { requestPasswordReset } from "../api/authenticationApi";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const requestMutation = useMutation({ mutationFn: requestPasswordReset });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    requestMutation.mutate(email.trim());
  }

  return (
    <main className="centeredPage">
      <Typography variant="h4" component="h1" color="primary" gutterBottom>
        {texts.applicationName}
      </Typography>
      <Typography variant="h6" component="h2">
        {texts.passwordReset.forgotTitle}
      </Typography>
      {requestMutation.isSuccess ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          {texts.passwordReset.linkSent(email.trim())}
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {texts.passwordReset.forgotIntroduction}
          </Typography>
          <TextField
            label={texts.authentication.email}
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="email"
            autoFocus
            required
          />
          {requestMutation.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {describeError(requestMutation.error)}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 2 }}
            disabled={requestMutation.isPending}
          >
            {texts.passwordReset.sendLink}
          </Button>
        </form>
      )}
      <Link component={RouterLink} to="/login" sx={{ mt: 3, textAlign: "center" }}>
        {texts.passwordReset.backToLogIn}
      </Link>
    </main>
  );
}
