import react from "@vitejs/plugin-react";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const contentSecurityPolicy =
  "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: data:; media-src 'self' blob:; worker-src 'self' blob:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'none'; frame-ancestors 'none'; manifest-src 'self'";

function productionCsp(): Plugin {
  return {
    name: "photon-production-csp",
    transformIndexHtml(_html, context) {
      if (context.server) {
        return;
      }

      return [
        {
          tag: "meta",
          attrs: {
            "http-equiv": "Content-Security-Policy",
            content: contentSecurityPolicy
          },
          injectTo: "head"
        }
      ];
    }
  };
}

export default defineConfig({
  plugins: [
    productionCsp(),
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Photon",
        short_name: "Photon",
        description: "Send a photo phone-to-phone with animated QR codes and no server in the transfer.",
        theme_color: "#0a0b0f",
        background_color: "#0a0b0f",
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
        globPatterns: ["**/*.{js,css,html,wasm,woff,woff2}"],
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
