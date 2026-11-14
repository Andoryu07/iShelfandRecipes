import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { deleteAccount } from "../api/authenticationApi";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { texts } from "../translations/cs";

export function DeleteAccountButton() {
  const { logOut } = useAuthentication();
  const [isOpen, setIsOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const deleteMutation = useMutation({
    mutationFn: () => deleteAccount(password),
    onSuccess: () => logOut(),
  });

  function close() {
    setIsOpen(false);
    setPassword("");
    setConfirmation("");
    deleteMutation.reset();
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    deleteMutation.mutate();
  }

  return (
    <>
      <Button color="error" onClick={() => setIsOpen(true)}>
        {texts.account.deleteAccount}
      </Button>
      <Dialog open={isOpen} onClose={close} fullWidth>
        <form onSubmit={submit}>
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
            <Button onClick={close}>{texts.common.cancel}</Button>
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
    </>
  );
}
