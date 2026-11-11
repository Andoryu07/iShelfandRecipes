import { Button, Dialog, DialogActions, DialogContent, DialogContentText } from "@mui/material";
import { texts } from "../translations/cs";

interface ConfirmationDialogProps {
  message: string | null;
  confirmLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmationDialog({ message, confirmLabel, onConfirm, onClose }: ConfirmationDialogProps) {
  return (
    <Dialog open={message !== null} onClose={onClose}>
      <DialogContent>
        <DialogContentText>{message}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{texts.common.cancel}</Button>
        <Button color="error" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
