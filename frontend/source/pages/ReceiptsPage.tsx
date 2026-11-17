import PhotoCameraRoundedIcon from "@mui/icons-material/PhotoCameraRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Box,
  Avatar,
  Button,
  Card,
  CardActionArea,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Snackbar,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { planQueryKey, usePlan } from "../plans/usePlan";
import { RewardedAdButton } from "../ads/RewardedAdButton";
import { AdSlot } from "../ads/AdSlot";
import { describeSavedReceipt, sameFileReceipt } from "../receipts/savedReceipts";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link as RouterLink, useSearchParams } from "react-router";
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
import { SharedReceiptDialog } from "../receipts/SharedReceiptDialog";
import { clearSharedReceipt, isSupportedReceiptFile, loadSharedReceipt } from "../receipts/sharedReceipt";
import { SpendingView } from "../spending/SpendingView";
import { formatDate, texts } from "../translations/cs";

export function ReceiptsPage() {
  const { household } = useCurrentHousehold();
  return household ? <Receipts householdId={household.id} /> : null;
}

function Receipts({ householdId }: { householdId: number }) {
  const { user, replaceUser } = useAuthentication();
  const queryClient = useQueryClient();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pendingInput, setPendingInput] = useState<"camera" | "file" | "shared">("camera");
  const [sharedFile, setSharedFile] = useState<File | null>(null);
  const [sharedProblem, setSharedProblem] = useState<string | null>(null);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [scannedReceipt, setScannedReceipt] = useState<ScannedReceipt | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);
  const [isSavedMessageOpen, setIsSavedMessageOpen] = useState(false);
  const storageLocations = useStorageLocations(householdId).data ?? [];
  const [searchParameters, setSearchParameters] = useSearchParams();
  const isSpendingView = searchParameters.get("view") === "spending";
  const sharedParameter = searchParameters.get("shared");

  useEffect(() => {
    if (sharedParameter === null) {
      return;
    }
    setSearchParameters({}, { replace: true });
    const loading = sharedParameter === "1" ? loadSharedReceipt() : Promise.resolve(undefined);
    loading
      .then((file) => {
        if (file === undefined) {
          setSharedProblem(texts.receipts.sharedUnsupported);
        } else if (!file) {
          setSharedProblem(texts.receipts.sharedMissing);
        } else if (!isSupportedReceiptFile(file)) {
          setSharedProblem(texts.receipts.sharedUnsupported);
          void clearSharedReceipt();
        } else {
          setSharedFile(file);
        }
      })
      .catch(() => setSharedProblem(texts.receipts.sharedMissing));
  }, [sharedParameter, setSearchParameters]);
  const receiptsQuery = useQuery({
    queryKey: ["households", householdId, "receipts"],
    queryFn: () => listReceipts(householdId),
  });
  const consentMutation = useMutation({
    mutationFn: giveReceiptConsent,
    onSuccess: (updatedUser) => {
      replaceUser(updatedUser);
      setIsConsentOpen(false);
      if (pendingInput === "shared") {
        scanSharedFile();
      } else {
        (pendingInput === "camera" ? cameraInput : fileInput).current?.click();
      }
    },
  });
  const scanMutation = useMutation({
    mutationFn: async ({ file, ignoreSameFile = false }: { file: File; ignoreSameFile?: boolean }) => {
      const content = await resizeImage(file);
      const fileName = content === file ? file.name : "receipt.jpg";
      return scanReceipt(householdId, content, fileName, ignoreSameFile);
    },
    onSuccess: setScannedReceipt,
    onSettled: () => queryClient.invalidateQueries({ queryKey: planQueryKey }),
  });
  const sameFile = sameFileReceipt(scanMutation.error);
  const planQuery = usePlan();
  const receiptScans = planQuery.data?.receiptScans;
  const receiptScansLeft = receiptScans ? Math.max(0, receiptScans.limit - receiptScans.used) : null;

  function startScan(input: "camera" | "file") {
    if (user?.receiptConsentGivenAt) {
      (input === "camera" ? cameraInput : fileInput).current?.click();
    } else {
      setPendingInput(input);
      setIsConsentOpen(true);
    }
  }

  function scanSharedFile() {
    if (sharedFile) {
      scanMutation.mutate({ file: sharedFile });
      setSharedFile(null);
      void clearSharedReceipt();
    }
  }

  function confirmSharedFile() {
    if (user?.receiptConsentGivenAt) {
      scanSharedFile();
    } else {
      setPendingInput("shared");
      setIsConsentOpen(true);
    }
  }

  function cancelSharedFile() {
    setSharedFile(null);
    void clearSharedReceipt();
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      scanMutation.mutate({ file });
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

  const viewToggle = (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      value={isSpendingView ? "spending" : "receipts"}
      onChange={(_, value: string | null) =>
        value && setSearchParameters(value === "spending" ? { view: "spending" } : {})
      }
      sx={{ mb: 1 }}
    >
      <ToggleButton value="receipts">{texts.spending.receiptsTab}</ToggleButton>
      <ToggleButton value="spending">{texts.spending.spendingTab}</ToggleButton>
    </ToggleButtonGroup>
  );

  if (isSpendingView) {
    return (
      <>
        {viewToggle}
        <SpendingView householdId={householdId} />
      </>
    );
  }

  return (
    <>
      {viewToggle}
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
      <Card
        sx={{ mt: 1, borderStyle: "dashed", borderWidth: 2, bgcolor: "action.hover", textAlign: "center" }}
      >
        <CardActionArea onClick={() => startScan("camera")} disabled={scanMutation.isPending} sx={{ py: 3 }}>
          {scanMutation.isPending ? (
            <CircularProgress />
          ) : (
            <PhotoCameraRoundedIcon color="primary" sx={{ fontSize: 44 }} />
          )}
          <Typography variant="h6" sx={{ mt: 1 }}>
            {scanMutation.isPending ? texts.receipts.scanning : texts.receipts.scan}
          </Typography>
        </CardActionArea>
        <Button
          startIcon={<UploadFileRoundedIcon />}
          onClick={() => startScan("file")}
          disabled={scanMutation.isPending}
          sx={{ mb: 1.5 }}
        >
          {texts.receipts.uploadFile}
        </Button>
      </Card>
      {receiptScansLeft !== null && (receiptScansLeft === 0 || receiptScansLeft <= 3) && (
        <Typography
          variant="body2"
          color={receiptScansLeft === 0 ? "warning.main" : "text.secondary"}
          sx={{ mt: 1, textAlign: "center" }}
        >
          {receiptScansLeft === 0
            ? user?.isGuest
              ? texts.guest.receiptTrialUsed
              : texts.premium.receiptLimitReached
            : texts.premium.receiptScansLeft(receiptScansLeft)}{" "}
          <Link component={RouterLink} to={user?.isGuest ? "/profile/account" : "/profile/premium"}>
            {user?.isGuest ? texts.guest.createAccount : texts.premium.showPremium}
          </Link>
        </Typography>
      )}
      {receiptScansLeft === 0 && (
        <Box sx={{ textAlign: "center" }}>
          <RewardedAdButton kind="receiptScan" />
        </Box>
      )}
      {sameFile && scanMutation.variables && (
        <Dialog open onClose={() => scanMutation.reset()}>
          <DialogTitle>{texts.receipts.sameFileTitle}</DialogTitle>
          <DialogContent>
            <Typography>{texts.receipts.sameFileText(describeSavedReceipt(sameFile))}</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => scanMutation.reset()}>{texts.common.cancel}</Button>
            <Button
              onClick={() => {
                setSelectedReceiptId(sameFile.receiptId);
                scanMutation.reset();
              }}
            >
              {texts.receipts.showSavedReceipt}
            </Button>
            <Button
              variant="contained"
              onClick={() =>
                scanMutation.mutate({ file: scanMutation.variables!.file, ignoreSameFile: true })
              }
            >
              {texts.receipts.scanAnyway}
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {scanMutation.error && !sameFile && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {describeError(scanMutation.error, {
            413: texts.receipts.imageTooLarge,
            429: user?.isGuest ? texts.guest.receiptTrialUsed : texts.premium.receiptLimitReached,
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
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: "action.hover" }}>🧾</Avatar>
            </ListItemAvatar>
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
      {(receiptsQuery.data?.length ?? 0) > 0 && <AdSlot />}

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
      <SharedReceiptDialog
        file={isConsentOpen ? null : sharedFile}
        onConfirm={confirmSharedFile}
        onCancel={cancelSharedFile}
      />
      <Snackbar
        open={sharedProblem !== null}
        autoHideDuration={5000}
        onClose={() => setSharedProblem(null)}
        message={sharedProblem}
      />
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
