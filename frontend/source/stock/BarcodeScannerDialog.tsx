import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { texts } from "../translations/cs";
import { createBarcodeReader, isProductBarcode } from "./barcodeDetection";

interface BarcodeScannerDialogProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export function BarcodeScannerDialog({ onDetected, onClose }: BarcodeScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<"starting" | "scanning" | "noCamera">("starting");
  const [typedBarcode, setTypedBarcode] = useState("");
  const detectedRef = useRef(onDetected);

  useEffect(() => {
    detectedRef.current = onDetected;
  }, [onDetected]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let isStopped = false;
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        const video = videoRef.current;
        if (isStopped || !video) {
          return;
        }
        video.srcObject = stream;
        await video.play();
        const reader = await createBarcodeReader();
        if (isStopped) {
          return;
        }
        setStatus("scanning");
        const scan = async () => {
          if (isStopped) {
            return;
          }
          try {
            const found = (await reader.detect(video)).find((barcode) => isProductBarcode(barcode.rawValue));
            if (found) {
              navigator.vibrate?.(80);
              isStopped = true;
              detectedRef.current(found.rawValue.trim());
              return;
            }
          } catch {
            // A frame that cannot be read is skipped.
          }
          timer = window.setTimeout(scan, 200);
        };
        void scan();
      } catch {
        if (!isStopped) {
          setStatus("noCamera");
        }
      }
    }
    void start();
    return () => {
      isStopped = true;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function submitTyped(event: FormEvent) {
    event.preventDefault();
    if (isProductBarcode(typedBarcode)) {
      onDetected(typedBarcode.trim());
    }
  }

  return (
    <Dialog open fullScreen onClose={onClose} sx={{ zIndex: "modal" }}>
      <Box sx={{ position: "relative", flex: 1, bgcolor: "black", display: "flex", alignItems: "center" }}>
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        <Box
          sx={{
            position: "absolute",
            left: "10%",
            right: "10%",
            top: "38%",
            height: "24%",
            border: 3,
            borderColor: "primary.light",
            borderRadius: 3,
            boxShadow: "0 0 0 100vmax rgba(0, 0, 0, 0.45)",
          }}
        />
        <IconButton
          aria-label={texts.common.close}
          onClick={onClose}
          sx={{ position: "absolute", top: 12, right: 12, color: "white", bgcolor: "rgba(0,0,0,0.4)" }}
        >
          <CloseRoundedIcon />
        </IconButton>
        <Stack sx={{ position: "absolute", top: 20, left: 16, right: 64, color: "white" }}>
          <Typography variant="h6">{texts.barcodes.title}</Typography>
          <Typography variant="body2">{texts.barcodes.hint}</Typography>
        </Stack>
        {status === "starting" && (
          <CircularProgress
            sx={{ position: "absolute", left: "calc(50% - 20px)", top: "calc(50% - 20px)" }}
          />
        )}
      </Box>
      <Box
        component="form"
        onSubmit={submitTyped}
        sx={{ p: 2, pb: "calc(16px + env(safe-area-inset-bottom))" }}
      >
        {status === "noCamera" && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            {texts.barcodes.noCamera}
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <TextField
            label={texts.barcodes.typeCode}
            value={typedBarcode}
            onChange={(event) => setTypedBarcode(event.target.value.replace(/\D/g, ""))}
            slotProps={{ htmlInput: { inputMode: "numeric", maxLength: 14 } }}
            sx={{ mt: 0 }}
          />
          <Button type="submit" variant="contained" disabled={!isProductBarcode(typedBarcode)}>
            {texts.barcodes.useCode}
          </Button>
        </Stack>
      </Box>
    </Dialog>
  );
}
