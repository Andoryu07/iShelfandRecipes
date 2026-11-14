import { Alert, Button, Link, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, useLocation } from "react-router";
import { confirmPasswordReset } from "../api/authenticationApi";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

export function ResetPasswordPage() {
  const token = new URLSearchParams(useLocation().hash.slice(1)).get("token") ?? "";
  const [newPassword, setNewPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const confirmMutation = useMutation({
    mutationFn: () => confirmPasswordReset(token, newPassword),
    onSuccess: () => window.history.replaceState(null, "", window.location.pathname),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const passwordsDiffer = newPassword !== repeatedPassword;
    setMismatch(passwordsDiffer);
    if (!passwordsDiffer) {
      confirmMutation.mutate();
    }
  }

  return (
    <main className="centeredPage">
      <Typography variant="h4" component="h1" color="primary" gutterBottom>
        {texts.applicationName}
      </Typography>
      <Typography variant="h6" component="h2">
        {texts.passwordReset.newPasswordTitle}
      </Typography>
      {confirmMutation.isSuccess ? (
        <>
          <Alert severity="success" sx={{ mt: 2 }}>
            {texts.passwordReset.passwordChanged}
          </Alert>
          <Button
            component={RouterLink}
            to="/login"
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 2 }}
          >
            {texts.authentication.logIn}
          </Button>
        </>
      ) : !token ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {texts.passwordReset.invalidLink}
        </Alert>
      ) : (
        <form onSubmit={handleSubmit}>
          <NewPasswordFields
            newPassword={newPassword}
            repeatedPassword={repeatedPassword}
            onNewPasswordChange={setNewPassword}
            onRepeatedPasswordChange={setRepeatedPassword}
            mismatch={mismatch}
          />
          {confirmMutation.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {describeError(confirmMutation.error, { 400: texts.passwordReset.invalidLink })}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            size="large"
            fullWidth
            sx={{ mt: 2 }}
            disabled={confirmMutation.isPending}
          >
            {texts.passwordReset.savePassword}
          </Button>
        </form>
      )}
      {!confirmMutation.isSuccess && (
        <Link component={RouterLink} to="/forgot-password" sx={{ mt: 3, textAlign: "center" }}>
          {texts.passwordReset.requestNewLink}
        </Link>
      )}
    </main>
  );
}

interface NewPasswordFieldsProps {
  newPassword: string;
  repeatedPassword: string;
  onNewPasswordChange: (value: string) => void;
  onRepeatedPasswordChange: (value: string) => void;
  mismatch: boolean;
}

export function NewPasswordFields({
  newPassword,
  repeatedPassword,
  onNewPasswordChange,
  onRepeatedPasswordChange,
  mismatch,
}: NewPasswordFieldsProps) {
  return (
    <>
      <TextField
        label={texts.passwordReset.newPassword}
        type="password"
        value={newPassword}
        onChange={(event) => onNewPasswordChange(event.target.value)}
        autoComplete="new-password"
        helperText={texts.authentication.passwordHint}
        slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
        required
      />
      <TextField
        label={texts.passwordReset.repeatPassword}
        type="password"
        value={repeatedPassword}
        onChange={(event) => onRepeatedPasswordChange(event.target.value)}
        autoComplete="new-password"
        error={mismatch}
        helperText={mismatch ? texts.passwordReset.passwordsDiffer : undefined}
        slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
        required
      />
    </>
  );
}
