import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

export default defineConfig({
  define: {
    __APPLICATION_VERSION__: JSON.stringify(process.env.npm_package_version ?? "0.1.0"),
  },
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
        name: "iShelf a recepty",
        short_name: "iShelf",
        description: "Společné zásoby, účtenky a recepty pro celou domácnost",
        lang: "cs",
        start_url: "/",
        display: "standalone",
        background_color: "#f6f7f4",
        theme_color: "#2e7d4f",
        share_target: {
          action: "/share-receipt",
          method: "POST",
          enctype: "multipart/form-data",
          params: { files: [{ name: "receipt", accept: ["image/*", "application/pdf", ".pdf"] }] },
        },
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
