// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [
      VitePWA({
        strategies: "generateSW",
        registerType: "autoUpdate",
        injectRegister: null,
        devOptions: { enabled: false },
        manifest: false,
        filename: "sw.js",
        workbox: {
          globPatterns: ["**/*.{js,css,woff2,svg,png,ico}"],
          globIgnores: ["qimg/**"],
          navigateFallback: null,
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
              handler: "NetworkFirst",
              options: { cacheName: "qb-pages", networkTimeoutSeconds: 4, expiration: { maxEntries: 30 } },
            },
            {
              // Hashed app files never change, so the saved copy is always right.
              urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/assets/"),
              handler: "CacheFirst",
              options: { cacheName: "qb-assets", expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 60 } },
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/qimg/"),
              handler: "CacheFirst",
              options: { cacheName: "qb-images", expiration: { maxEntries: 3000, maxAgeSeconds: 60 * 60 * 24 * 180 } },
            },
            {
              // Only public deck metadata is shared-cache safe; subscription data and questions are never cached here.
              urlPattern: ({ url, request }) => request.method === "GET" && url.hostname.endsWith(".supabase.co") && url.pathname === "/rest/v1/decks",
              handler: "NetworkFirst",
              options: { cacheName: "qb-decks-v2", networkTimeoutSeconds: 5, expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 60 } },
            },
            {
              urlPattern: ({ url }) => url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com",
              handler: "StaleWhileRevalidate",
              options: { cacheName: "qb-fonts" },
            },
          ],
        },
      }),
    ],
  },
});
