import { Alert, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { upgradeGuest } from "../api/authenticationApi";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

export function UpgradeGuestCard() {
  const { replaceUser } = useAuthentication();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const mutation = useMutation({
    mutationFn: () => upgradeGuest(email, password, displayName),
    onSuccess: async (user) => {
      replaceUser(user);
      await queryClient.invalidateQueries();
    },
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent component="form" onSubmit={submit}>
        <Typography variant="h6">{texts.guest.upgradeTitle}</Typography>
        <Typography variant="body2" color="text.secondary">
          {texts.guest.upgradeText}
        </Typography>
        <TextField
          label={texts.authentication.displayName}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          autoComplete="name"
          required
        />
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
          autoComplete="new-password"
          helperText={texts.authentication.passwordHint}
          slotProps={{ htmlInput: { minLength: 8, maxLength: 128 } }}
          required
        />
        {mutation.error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {describeError(mutation.error, { 409: texts.guest.emailTaken })}
          </Alert>
        )}
        <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={mutation.isPending}>
          {texts.guest.createAccount}
        </Button>
      </CardContent>
    </Card>
  );
}
