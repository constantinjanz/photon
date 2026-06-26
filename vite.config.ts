import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Photon",
        short_name: "Photon",
        description: "Send a photo phone-to-phone with animated QR codes and no server in the transfer.",
        theme_color: "#101820",
        background_color: "#f7f4ef",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icons/icon-192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "/icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,wasm}"],
        navigateFallback: "/index.html",
        runtimeCaching: []
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  test: {
    environment: "node",
    globals: true
  }
});
