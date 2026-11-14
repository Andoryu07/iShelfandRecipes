import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "class" },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: "#2e7d4f", contrastText: "#ffffff" },
        secondary: { main: "#e8743b" },
        warning: { main: "#d9822b" },
        background: { default: "#f5f6f2", paper: "#ffffff" },
        text: { primary: "#1d241f", secondary: "#5d6b62" },
        divider: "rgba(29, 36, 31, 0.1)",
      },
    },
    dark: {
      palette: {
        primary: { main: "#6fcf97", contrastText: "#0d1f14" },
        secondary: { main: "#f0956a" },
        warning: { main: "#f2a65a" },
        background: { default: "#111512", paper: "#1b211d" },
        text: { primary: "#e7ece8", secondary: "#9fb0a5" },
        divider: "rgba(231, 236, 232, 0.12)",
      },
    },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    h5: { fontWeight: 700 },
    h6: { fontWeight: 650 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 12 } } },
    MuiTextField: { defaultProps: { fullWidth: true, margin: "normal" } },
    MuiCard: { defaultProps: { variant: "outlined" } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 20 } } },
  },
});
