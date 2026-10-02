import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      // Precache only the build's own static assets. No runtimeCaching here on
      // purpose: the app shell and the Supabase API cache are architecturally
      // separate (see openspec/changes/pwa-offline-support/specs/offline/app-shell).
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        // El bundle principal (~2,1 MB desde el cambio aceptar-cotizacion-genera-venta)
        // supera el default de workbox de 2 MiB; sin esto el service worker no
        // genera la precarga y se pierde el arranque sin conexión.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
      },
      manifest: {
        name: "Lotes al Mando",
        short_name: "Lotes al Mando",
        description: "Plataforma inmobiliaria integral para gestión, comercialización y cobranza de proyectos de lotización.",
        theme_color: "#082B33",
        background_color: "#082B33",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  // ffmpeg.wasm arranca su propio worker: el pre-bundle de Vite lo rompe.
  optimizeDeps: { exclude: ["@ffmpeg/ffmpeg", "@ffmpeg/util"] },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
