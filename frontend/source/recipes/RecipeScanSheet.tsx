import AddAPhotoRoundedIcon from "@mui/icons-material/AddAPhotoRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState, type ChangeEvent } from "react";
import { Link as RouterLink } from "react-router";
import { ApiError } from "../api/apiClient";
import { giveReceiptConsent } from "../api/authenticationApi";
import { getRecipeScanAllowance, scanRecipe } from "../api/recipesApi";
import type { ScanPeriod, ScannedRecipe } from "../api/types";
import { useAuthentication } from "../authentication/AuthenticationContext";
import { BottomSheet } from "../components/BottomSheet";
import { objectUrlFor, releaseObjectUrl } from "../components/objectUrls";
import { describeError } from "../errorMessages";
import { resizeImage } from "../receipts/resizeImage";
import { texts } from "../translations/cs";

const maximumPages = 3;

interface RecipeScanSheetProps {
  householdId: number;
  onClose: () => void;
  onScanned: (recipe: ScannedRecipe) => void;
}

function PagePreview({ file, number, onRemove }: { file: File; number: number; onRemove: () => void }) {
  const url = file.type.startsWith("image/") ? objectUrlFor(file) : null;
  return (
    <Box
      sx={{
        position: "relative",
        width: 96,
        height: 128,
        borderRadius: 2,
        bgcolor: "action.hover",
        overflow: "hidden",
      }}
    >
      {url ? (
        <Box
          component="img"
          src={url}
          alt={texts.recipes.page(number)}
          sx={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <Stack sx={{ height: "100%", alignItems: "center", justifyContent: "center", p: 1 }}>
          <PictureAsPdfRoundedIcon color="error" />
          <Typography variant="caption" sx={{ wordBreak: "break-all", textAlign: "center" }}>
            {file.name}
          </Typography>
        </Stack>
      )}
      <IconButton
        size="small"
        aria-label={`${texts.recipes.removePage} ${number}`}
        onClick={onRemove}
        sx={{
          position: "absolute",
          top: 2,
          right: 2,
          bgcolor: "background.paper",
          "&:hover": { bgcolor: "background.paper" },
        }}
      >
        <CloseRoundedIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}

function describeScanError(error: unknown, limit: number, period: ScanPeriod): string {
  if (error instanceof ApiError) {
    const messages: Record<number, string> = {
      413: texts.recipes.scanTooLarge,
      415: texts.recipes.scanUnsupported,
      422: texts.recipes.scanNoRecipe,
      429: texts.recipes.scanLimitReached(limit, period),
      502: texts.recipes.scanFailed,
      503: texts.recipes.scanNotConfigured,
    };
    if (messages[error.status]) {
      return messages[error.status];
    }
  }
  return describeError(error);
}

export function RecipeScanSheet({ householdId, onClose, onScanned }: RecipeScanSheetProps) {
  const { user, replaceUser } = useAuthentication();
  const cameraInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [pages, setPages] = useState<{ id: number; file: File }[]>([]);
  const [nextPageId, setNextPageId] = useState(1);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const allowanceQuery = useQuery({
    queryKey: ["households", householdId, "recipeScanAllowance"],
    queryFn: () => getRecipeScanAllowance(householdId),
    staleTime: 0,
  });
  const limit = allowanceQuery.data?.scanLimit ?? 3;
  const period = allowanceQuery.data?.scanPeriod ?? "total";
  const isLimitReached = allowanceQuery.data
    ? allowanceQuery.data.usedScans >= allowanceQuery.data.scanLimit
    : false;

  const scanMutation = useMutation({
    mutationFn: async () => {
      const photos = await Promise.all(
        pages.map(async ({ file }, index) => {
          const content = await resizeImage(file);
          return { content, fileName: content === file ? file.name : `stranka-${index + 1}.jpg` };
        }),
      );
      return scanRecipe(householdId, photos);
    },
    onSuccess: onScanned,
  });
  const consentMutation = useMutation({
    mutationFn: giveReceiptConsent,
    onSuccess: (updatedUser) => {
      replaceUser(updatedUser);
      setIsConsentOpen(false);
      scanMutation.mutate();
    },
  });

  function addFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, maximumPages - pages.length);
    event.target.value = "";
    setPages((current) => [...current, ...files.map((file, index) => ({ id: nextPageId + index, file }))]);
    setNextPageId((id) => id + files.length);
  }

  function read() {
    if (user?.recipePhotoConsentGivenAt) {
      scanMutation.mutate();
    } else {
      setIsConsentOpen(true);
    }
  }

  const hasReceiptConsent = Boolean(user?.receiptConsentGivenAt);

  return (
    <BottomSheet open onClose={scanMutation.isPending ? () => undefined : onClose}>
      <DialogTitle>{texts.recipes.scanTitle}</DialogTitle>
      <DialogContent>
        <input
          ref={cameraInput}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={addFiles}
        />
        <input
          ref={fileInput}
          type="file"
          accept="image/*,application/pdf"
          multiple
          hidden
          onChange={addFiles}
        />
        <Typography color="text.secondary">{texts.recipes.scanIntroduction}</Typography>
        {allowanceQuery.data && (
          <Typography variant="body2" color={isLimitReached ? "error" : "text.secondary"} sx={{ mt: 1 }}>
            {isLimitReached
              ? texts.recipes.scanLimitReached(limit, period)
              : texts.recipes.scanAllowance(allowanceQuery.data.usedScans, limit, period)}
          </Typography>
        )}
        {pages.length > 0 && (
          <Stack direction="row" sx={{ gap: 1, mt: 2, flexWrap: "wrap" }}>
            {pages.map((page, index) => (
              <PagePreview
                key={page.id}
                file={page.file}
                number={index + 1}
                onRemove={() => {
                  releaseObjectUrl(page.file);
                  setPages((current) => current.filter((other) => other.id !== page.id));
                }}
              />
            ))}
          </Stack>
        )}
        {pages.length < maximumPages && !isLimitReached && (
          <Stack direction="row" sx={{ gap: 1, mt: 2, flexWrap: "wrap" }}>
            <Button
              variant="outlined"
              startIcon={<AddAPhotoRoundedIcon />}
              onClick={() => cameraInput.current?.click()}
              disabled={scanMutation.isPending}
            >
              {texts.recipes.takePhoto}
            </Button>
            <Button
              startIcon={<UploadFileRoundedIcon />}
              onClick={() => fileInput.current?.click()}
              disabled={scanMutation.isPending}
            >
              {texts.recipes.uploadPhoto}
            </Button>
          </Stack>
        )}
        {scanMutation.isPending && (
          <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, mt: 2 }}>
            <CircularProgress size={24} />
            <Typography>{texts.recipes.readingRecipe}</Typography>
          </Stack>
        )}
        {scanMutation.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {describeScanError(scanMutation.error, limit, period)}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={scanMutation.isPending}>
          {texts.common.cancel}
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={read}
          disabled={pages.length === 0 || isLimitReached || scanMutation.isPending}
        >
          {texts.recipes.readRecipe}
        </Button>
      </DialogActions>

      <Dialog open={isConsentOpen} onClose={() => setIsConsentOpen(false)}>
        <DialogTitle>
          {hasReceiptConsent ? texts.recipes.recipeConsentTitle : texts.receipts.consentTitle}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {hasReceiptConsent ? texts.recipes.recipeConsentText : texts.receipts.consentText}
          </DialogContentText>
          <Link component={RouterLink} to="/privacy" sx={{ display: "inline-block", mt: 1 }}>
            {texts.account.privacyPolicy}
          </Link>
          {consentMutation.error && <Alert severity="error">{describeError(consentMutation.error)}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConsentOpen(false)}>{texts.common.cancel}</Button>
          <Button
            variant="contained"
            onClick={() => consentMutation.mutate()}
            disabled={consentMutation.isPending}
          >
            {texts.receipts.consentAgree}
          </Button>
        </DialogActions>
      </Dialog>
    </BottomSheet>
  );
}
