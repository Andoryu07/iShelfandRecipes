import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import { objectUrlFor } from "../components/objectUrls";
import { texts } from "../translations/cs";

interface SharedReceiptDialogProps {
  file: File | null;
  onConfirm: (file: File) => void;
  onCancel: () => void;
}

export function SharedReceiptDialog({ file, onConfirm, onCancel }: SharedReceiptDialogProps) {
  return (
    <Dialog open={file !== null} onClose={onCancel} fullWidth>
      <DialogTitle>{texts.receipts.sharedTitle}</DialogTitle>
      <DialogContent>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {texts.receipts.sharedText}
        </Typography>
        {file?.type.startsWith("image/") ? (
          <ImagePreview key={`${file.name}-${file.size}`} file={file} />
        ) : (
          <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
            <PictureAsPdfRoundedIcon color="error" />
            <Typography sx={{ wordBreak: "break-all" }}>{file?.name}</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>{texts.common.cancel}</Button>
        <Button variant="contained" onClick={() => file && onConfirm(file)}>
          {texts.receipts.sharedConfirm}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ImagePreview({ file }: { file: File }) {
  const url = objectUrlFor(file);
  return (
    <Box
      component="img"
      src={url}
      alt={file.name}
      sx={{ display: "block", maxWidth: "100%", maxHeight: 280, mx: "auto", borderRadius: 2, boxShadow: 1 }}
    />
  );
}
