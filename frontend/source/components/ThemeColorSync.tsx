import { useColorScheme } from "@mui/material/styles";
import { useEffect } from "react";

const statusBarColors = { light: "#f5f6f2", dark: "#111512" };

export function ThemeColorSync() {
  const { colorScheme } = useColorScheme();
  useEffect(() => {
    const color = statusBarColors[colorScheme === "dark" ? "dark" : "light"];
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", color);
  }, [colorScheme]);
  return null;
}
