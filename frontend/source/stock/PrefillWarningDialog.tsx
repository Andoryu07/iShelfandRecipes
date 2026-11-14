import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Typography,
} from "@mui/material";
import { useState } from "react";
import { texts } from "../translations/cs";

const hiddenStorageKey = "iShelf.hidePrefillWarning";

export function isPrefillWarningHidden(): boolean {
  try {
    return localStorage.getItem(hiddenStorageKey) === "true";
  } catch {
    return false;
  }
}

function hidePrefillWarning(): void {
  try {
    localStorage.setItem(hiddenStorageKey, "true");
  } catch {
    // Without storage the warning simply shows again next time.
  }
}

interface PrefillWarningDialogProps {
  quantity: string | null;
  onConfirm: () => void;
  onEdit: () => void;
}

export function PrefillWarningDialog({ quantity, onConfirm, onEdit }: PrefillWarningDialogProps) {
  const [doNotShowAgain, setDoNotShowAgain] = useState(false);
  return (
    <Dialog open={quantity !== null} onClose={onEdit} fullWidth>
      <DialogTitle>{texts.stock.prefillWarningTitle}</DialogTitle>
      <DialogContent>
        <Typography>{quantity && texts.stock.prefillWarningText(quantity)}</Typography>
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Checkbox
              checked={doNotShowAgain}
              onChange={(event) => setDoNotShowAgain(event.target.checked)}
            />
          }
          label={texts.stock.doNotShowAgain}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onEdit}>{texts.stock.editQuantity}</Button>
        <Button
          variant="contained"
          onClick={() => {
            if (doNotShowAgain) {
              hidePrefillWarning();
            }
            onConfirm();
          }}
        >
          {texts.stock.prefillConfirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
