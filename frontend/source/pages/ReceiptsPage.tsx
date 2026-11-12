import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  Link,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";
import { Link as RouterLink } from "react-router";
import { giveReceiptConsent } from "../api/authenticationApi";
import { listReceipts, scanReceipt } from "../api/receiptsApi";
import type { ScannedReceipt } from "../api/types";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { describeError } from "../errorMessages";
import { useCurrentHousehold } from "../households/useCurrentHousehold";
import { useStorageLocations } from "../households/useStorageLocations";
import { formatMoney } from "../receipts/money";
import { ReceiptDetailDialog } from "../receipts/ReceiptDetailDialog";
import { ReceiptReview } from "../receipts/ReceiptReview";
import { resizeImage } from "../receipts/resizeImage";
import { formatDate, texts } from "../translations/cs";

export function ReceiptsPage() {
  const { household } = useCurrentHousehold();
  return household ? <Receipts householdId={household.id} /> : null;
}

function Receipts({ householdId }: { householdId: number }) {
  const { user, replaceUser } = useAuthentication();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingInput, setPendingInput] = useState<"camera" | "file">("camera");
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ScannedReceipt | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
  const [isSavedMessageOpen, setIsSavedMessageOpen] = useState(false);
  const storageLocations = useStorageLocations(householdId).data ?? [];
  const receiptsQuery = useQuery({
    queryKey: ["households", householdId, "receipts"],
    queryFn: () => listReceipts(householdId),
  });
  const consentMutation = useMutation({
    mutationFn: giveReceiptConsent,
    onSuccess: (updatedUser) => {
      replaceUser(updatedUser);
      setIsConsentOpen(false);
      (pendingInput === "camera" ? cameraInput : fileInput).current?.click();
    },
  });
  const scanMutation = useMutation({
    mutationFn: async (file: File) => {
      const content = await resizeImage(file);
      const fileName = content === file ? file.name : "receipt.jpg";
      return scanReceipt(householdId, content, fileName);
    },
    onSuccess: setScannedReceipt,
  });

  function startScan(input: "camera" | "file") {
    if (user?.receiptConsentGivenAt) {
      (input === "camera" ? cameraInput : fileInput).current?.click();
    } else {
      setPendingInput(input);
      setIsConsentOpen(true);
    }
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      scanMutation.mutate(file);
    }
  }

  if (scannedReceipt) {
    return (
      <ReceiptReview
        householdId={householdId}
        scannedReceipt={scannedReceipt}
        storageLocations={storageLocations}
        onFinished={(saved) => {
          setScannedReceipt(null);
          scanMutation.reset();
          setIsSavedMessageOpen(saved);
        }}
      />
    );
  }

  return (
    <>
      <Typography variant="h5" component="h1">
        {texts.navigation.receipts}
      </Typography>
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleFileSelected}
      />
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        hidden
        onChange={handleFileSelected}
      />
      <Button
        variant="contained"
        size="large"
        fullWidth
        startIcon={
          scanMutation.isPending ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraRoundedIcon />
        }
        onClick={() => startScan("camera")}
        disabled={scanMutation.isPending}
        sx={{ mt: 2 }}
      >
        {scanMutation.isPending ? texts.receipts.scanning : texts.receipts.scan}
      </Button>
      <Button
        variant="outlined"
        fullWidth
        startIcon={<UploadFileRoundedIcon />}
        onClick={() => startScan("file")}
        disabled={scanMutation.isPending}
        sx={{ mt: 1 }}
      >
        {texts.receipts.uploadFile}
      </Button>
      {scanMutation.error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {describeError(scanMutation.error, {
            413: texts.receipts.imageTooLarge,
            415: texts.receipts.unsupportedFile,
            502: texts.receipts.readFailed,
            503: texts.receipts.notConfigured,
          })}
        </Alert>
      )}

      {receiptsQuery.error && <Alert severity="error">{describeError(receiptsQuery.error)}</Alert>}
      {receiptsQuery.data?.length === 0 && (
        <Typography color="text.secondary" sx={{ mt: 3 }}>
          {texts.receipts.empty}
        </Typography>
      )}
      <List>
        {receiptsQuery.data?.map((receipt) => (
          <ListItemButton key={receipt.id} divider onClick={() => setSelectedReceiptId(receipt.id)}>
            <ListItemText
              primary={`${receipt.storeName ?? "?"} · ${formatDate(receipt.purchasedOn)}`}
              secondary={[
                texts.receipts.itemCount(receipt.itemCount),
                receipt.uploadedByDisplayName
                  ? texts.receipts.uploadedBy(receipt.uploadedByDisplayName)
                  : null,
                receipt.itemsSumMatchesTotal ? null : texts.receipts.sumMismatchShort,
              ]
                .filter(Boolean)
                .join(" · ")}
            />
            <Typography sx={{ ml: 2, whiteSpace: "nowrap" }}>{formatMoney(receipt.totalAmount)}</Typography>
          </ListItemButton>
        ))}
      </List>

      <Dialog open={isConsentOpen} onClose={() => setIsConsentOpen(false)}>
        <DialogTitle>{texts.receipts.consentTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{texts.receipts.consentText}</DialogContentText>
          <Link component={RouterLink} to="/privacy" sx={{ display: "inline-block", mt: 1 }}>
            {texts.account.privacyPolicy}
          </Link>
          {consentMutation.error && <Alert severity="error">{describeError(consentMutation.error)}</Alert>}
        </DialogContent>
        <DialogActions>
          <Stack direction="row" spacing={1} useFlexGap>
            <Button onClick={() => setIsConsentOpen(false)}>{texts.common.cancel}</Button>
            <Button
              variant="contained"
              onClick={() => consentMutation.mutate()}
              disabled={consentMutation.isPending}
            >
              {texts.receipts.consentAgree}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
      {selectedReceiptId !== null && (
        <ReceiptDetailDialog receiptId={selectedReceiptId} onClose={() => setSelectedReceiptId(null)} />
      )}
      <Snackbar
        open={isSavedMessageOpen}
        autoHideDuration={3000}
        onClose={() => setIsSavedMessageOpen(false)}
        message={texts.receipts.saved}
      />
    </>
  );
}
