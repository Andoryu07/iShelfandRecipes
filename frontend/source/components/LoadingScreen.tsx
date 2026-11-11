import { Box, CircularProgress } from "@mui/material";

export function LoadingScreen() {
  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <CircularProgress />
    </Box>
  );
}
