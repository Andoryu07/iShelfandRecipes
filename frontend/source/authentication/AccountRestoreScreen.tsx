import { Alert, Button, Stack, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { restoreAccount } from "../api/authenticationApi";
import { describeError } from "../errorMessages";
import { formatDate, texts } from "../translations/cs";
import { useAuthentication } from "./AuthenticationContext";

export function AccountRestoreScreen({ deletionScheduledAt }: { deletionScheduledAt: string }) {
  const { replaceUser, logOut } = useAuthentication();
  const restoreMutation = useMutation({ mutationFn: restoreAccount, onSuccess: replaceUser });
  const date = formatDate(new Date(deletionScheduledAt).toLocaleDateString("sv-SE"));

  return (
    <main className="centeredPage">
      <Typography variant="h5" component="h1" gutterBottom>
        {texts.account.restoreTitle}
      </Typography>
      <Typography>{texts.account.restoreText(date)}</Typography>
      {restoreMutation.error && <Alert severity="error">{describeError(restoreMutation.error)}</Alert>}
      <Stack spacing={1} sx={{ mt: 3 }}>
        <Button
          variant="contained"
          size="large"
          onClick={() => restoreMutation.mutate()}
          disabled={restoreMutation.isPending}
        >
          {texts.account.restore}
        </Button>
        <Button onClick={logOut}>{texts.authentication.logOut}</Button>
      </Stack>
    </main>
  );
}
