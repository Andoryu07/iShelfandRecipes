import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: "injectManifest",
      srcDir: "source",
      filename: "serviceWorker.ts",
      registerType: "autoUpdate",
      injectRegister: false,
      devOptions: { enabled: true, type: "module" },
      manifest: {
        name: "iShelf and Recipes",
        short_name: "iShelf",
        description: "Shared household food inventory with receipt scanning and recipes",
        lang: "cs",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f7f4",
        theme_color: "#2e7d4f",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": {
        target: backendUrl,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./source/testSetup.ts"],
  },
});
