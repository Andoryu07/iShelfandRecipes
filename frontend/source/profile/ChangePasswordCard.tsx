import { Alert, Button, Card, CardContent, Collapse, Snackbar, TextField, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { setAccessToken } from "../api/apiClient";
import { changePassword } from "../api/authenticationApi";
import { describeError } from "../errorMessages";
import { NewPasswordFields } from "../pages/ResetPasswordPage";
import { texts } from "../translations/cs";

export function ChangePasswordCard() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatedPassword, setRepeatedPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [isChangedMessageOpen, setIsChangedMessageOpen] = useState(false);
  const changeMutation = useMutation({
    mutationFn: () => changePassword(currentPassword, newPassword),
    onSuccess: (tokens) => {
      setAccessToken(tokens.accessToken);
      setIsOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setRepeatedPassword("");
      setIsChangedMessageOpen(true);
    },
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const passwordsDiffer = newPassword !== repeatedPassword;
    setMismatch(passwordsDiffer);
    if (!passwordsDiffer) {
      changeMutation.mutate();
    }
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography sx={{ fontWeight: 600 }}>{texts.passwordReset.changeTitle}</Typography>
        <Typography variant="body2" color="text.secondary">
          {texts.passwordReset.changeDescription}
        </Typography>
        {!isOpen && (
          <Button sx={{ mt: 1, px: 0 }} onClick={() => setIsOpen(true)}>
            {texts.passwordReset.changeButton}
          </Button>
        )}
        <Collapse in={isOpen} unmountOnExit>
          <form onSubmit={handleSubmit}>
            <TextField
              label={texts.passwordReset.currentPassword}
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              autoComplete="current-password"
              slotProps={{ htmlInput: { maxLength: 128 } }}
              required
            />
            <NewPasswordFields
              newPassword={newPassword}
              repeatedPassword={repeatedPassword}
              onNewPasswordChange={setNewPassword}
              onRepeatedPasswordChange={setRepeatedPassword}
              mismatch={mismatch}
            />
            {changeMutation.error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {describeError(changeMutation.error, { 403: texts.account.incorrectPassword })}
              </Alert>
            )}
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{ mt: 2 }}
              disabled={changeMutation.isPending}
            >
              {texts.passwordReset.savePassword}
            </Button>
            <Button fullWidth sx={{ mt: 1 }} onClick={() => setIsOpen(false)}>
              {texts.common.cancel}
            </Button>
          </form>
        </Collapse>
      </CardContent>
      <Snackbar
        open={isChangedMessageOpen}
        autoHideDuration={3000}
        onClose={() => setIsChangedMessageOpen(false)}
        message={texts.passwordReset.changed}
      />
    </Card>
  );
}
