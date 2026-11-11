import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField } from "@mui/material";
import { useState, type FormEvent } from "react";
import { texts } from "../translations/cs";

interface TextInputDialogProps {
  title: string;
  label: string;
  initialValue: string;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

export function TextInputDialog({ title, label, initialValue, onSubmit, onClose }: TextInputDialogProps) {
  const [value, setValue] = useState(initialValue);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (value.trim()) {
      onSubmit(value.trim());
    }
  }

  return (
    <Dialog open onClose={onClose} fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label={label}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            slotProps={{ htmlInput: { maxLength: 100 } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{texts.common.cancel}</Button>
          <Button type="submit" disabled={!value.trim()}>
            {texts.common.save}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
