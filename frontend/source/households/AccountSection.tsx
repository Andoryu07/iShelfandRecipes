import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router";
import { deleteAccount, withdrawReceiptConsent } from "../api/authenticationApi";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { ConfirmationDialog } from "../components/ConfirmationDialog";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

export function AccountSection() {
  const { user, replaceUser, logOut } = useAuthentication();
  const [isWithdrawConfirmationOpen, setIsWithdrawConfirmationOpen] = useState(false);
  const [isWithdrawnMessageOpen, setIsWithdrawnMessageOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const withdrawMutation = useMutation({
    mutationFn: withdrawReceiptConsent,
    onSuccess: (updatedUser) => {
      replaceUser(updatedUser);
      setIsWithdrawnMessageOpen(true);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => logOut(),
  });

  function closeDeleteDialog() {
    setIsDeleteDialogOpen(false);
    setPassword("");
    setConfirmation("");
    deleteMutation.reset();
  }

  function submitDeletion(event: FormEvent) {
    event.preventDefault();
    deleteMutation.mutate();
  }

  return (
    <section className="section">
      <Typography variant="h6" component="h2">
        {texts.account.title}
      </Typography>
      <Typography color="text.secondary">{user?.email}</Typography>
      <Stack spacing={1} sx={{ mt: 1, alignItems: "flex-start" }}>
        <Link component={RouterLink} to="/privacy">
          {texts.account.privacyPolicy}
        </Link>
        {user?.receiptConsentGivenAt && (
          <Button onClick={() => setIsWithdrawConfirmationOpen(true)} disabled={withdrawMutation.isPending}>
            {texts.account.withdrawConsent}
          </Button>
        )}
        <Button color="error" onClick={() => setIsDeleteDialogOpen(true)}>
          {texts.account.deleteAccount}
        </Button>
      </Stack>
      {withdrawMutation.error && <Alert severity="error">{describeError(withdrawMutation.error)}</Alert>}

      <ConfirmationDialog
        message={isWithdrawConfirmationOpen ? texts.account.withdrawConsentConfirmation : null}
        confirmLabel={texts.account.withdrawConsent}
        onConfirm={() => {
          setIsWithdrawConfirmationOpen(false);
          withdrawMutation.mutate();
        }}
        onClose={() => setIsWithdrawConfirmationOpen(false)}
      />
      <Dialog open={isDeleteDialogOpen} onClose={closeDeleteDialog} fullWidth>
        <form onSubmit={submitDeletion}>
          <DialogTitle>{texts.account.deleteAccountTitle}</DialogTitle>
          <DialogContent>
            <DialogContentText>{texts.account.deleteAccountText}</DialogContentText>
            <TextField
              type="password"
              label={texts.account.password}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
            <TextField
              label={texts.account.typeConfirmation}
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              slotProps={{ htmlInput: { autoCapitalize: "characters", autoComplete: "off" } }}
              required
            />
            {deleteMutation.error && (
              <Alert severity="error">
                {describeError(deleteMutation.error, { 403: texts.account.incorrectPassword })}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeDeleteDialog}>{texts.common.cancel}</Button>
            <Button
              type="submit"
              color="error"
              variant="contained"
              disabled={
                !password ||
                confirmation.trim().toUpperCase() !== texts.account.confirmationWord ||
                deleteMutation.isPending
              }
            >
              {texts.account.deleteAccount}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
      <Snackbar
        open={isWithdrawnMessageOpen}
        autoHideDuration={3000}
        onClose={() => setIsWithdrawnMessageOpen(false)}
        message={texts.account.consentWithdrawn}
      />
    </section>
  );
}
