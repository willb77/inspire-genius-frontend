import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { VitePWA } from "vite-plugin-pwa"
import { defineConfig, loadEnv, type Plugin } from "vite"

// Emits dist/version.json so the client can detect a stale bundle and
// force-reload. See src/lib/buildVersion.ts for the consumer side.
function versionManifestPlugin(version: string): Plugin {
  return {
    name: "ig-version-manifest",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version, builtAt: new Date().toISOString() }),
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const isDev = mode === "development"
  const appVersion = env.VITE_APP_VERSION || "dev"

  // ── URLs from environment (.env / .env.production / etc.) ────
  const apiBase = env.VITE_API_BASE_URL || "http://localhost:5173"
  const wsAgents = env.VITE_AGENTS_WEBSOCKET_BASE_URL || ""
  const wsAlex = env.VITE_ALEX_WEB_SOCKET_URL || ""
  const wsAgent = env.VITE_AGENT_WS_URL || ""

  // ── Content-Security-Policy ──────────────────────────────────
  // Dev needs unsafe-inline / unsafe-eval for Vite HMR
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self'"

  const sentryDsn = env.VITE_SENTRY_DSN || ""
  const sentryIngest = sentryDsn ? new URL(sentryDsn).origin : ""
  const connectSrc = ["'self'", apiBase, wsAgents, wsAlex, wsAgent, sentryIngest]
    .filter(Boolean)
    .join(" ")

  const frameSrc = `'self' https://lottie.host blob: ${apiBase}`
  const imgSrc = `'self' data: blob: ${apiBase}`
  const mediaSrc = `'self' blob: ${apiBase}`

  const csp = [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src ${imgSrc}`,
    `frame-src ${frameSrc}`,
    `connect-src ${connectSrc}`,
    `media-src ${mediaSrc}`,
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ")

  // ── Security headers (dev + preview) ─────────────────────────
  const securityHeaders: Record<string, string> = {
    "Content-Security-Policy": csp,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(self), geolocation=()",
  }

  // HSTS only for production (HTTPS)
  if (!isDev) {
    securityHeaders["Strict-Transport-Security"] =
      "max-age=31536000; includeSubDomains; preload"
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      versionManifestPlugin(appVersion),
      VitePWA({
        registerType: "autoUpdate",
        workbox: {
          // ── Precache: app shell ONLY ────────────────────────────────
          //
          // INCIDENT 2026-08-17. This was `**/*.{js,css,html,ico,png,woff2}`,
          // which resolved to 513 precache entries. A service worker fetches
          // its ENTIRE precache manifest on install, so one Chromebook opening
          // the site cold fired ~513 requests in seconds. A classroom shares a
          // single school NAT IP, so two devices exhausted the CloudFront WAF's
          // per-IP budget and the whole class got blank pages.
          //
          // The shell stays precached (installability + offline fallback); the
          // hashed build assets moved to runtime caching below, which fetches
          // them on demand instead of all at once. Cold-load request count
          // drops from ~513 to single digits.
          globPatterns: [
            "index.html",
            "offline.html",
            "manifest.json",
            "icons/icon-192x192.png",
            "icons/icon-512x512.png",
          ],
          maximumFileSizeToCacheInBytes: 3 * 1024 * 1024, // 3 MB
          navigateFallback: "/index.html",
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          runtimeCaching: [
            {
              // Hashed build output — content-addressed, so a cached entry can
              // never be stale for its URL. Served from cache and revalidated
              // in the background; fetched individually rather than all at once.
              //
              // `statuses: [200]` is deliberate: 0 (opaque) must NOT be cached
              // here or a WAF-blocked/404 response could be stored and replayed
              // as though it were a real module.
              urlPattern: /\/assets\/.*\.(?:js|mjs|css|woff2?)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "ig-build-assets",
                expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              // Static imagery / locale bundles — same reasoning, on demand.
              urlPattern: /\/(?:icons|images|locales)\/.*\.(?:png|jpe?g|svg|webp|json)$/i,
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "ig-static",
                expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "gstatic-fonts-cache",
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
        manifest: false, // Using public/manifest.json directly
        devOptions: {
          enabled: false,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        "@inspiresgenius/dag-builder": path.resolve(__dirname, "./src/packages/dag-builder"),
      },
    },
    build: {
      assetsDir: "assets",
      sourcemap: "hidden",
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ["react", "react-dom", "react-router-dom"],
            ui: [
              "@radix-ui/react-dialog",
              "@radix-ui/react-dropdown-menu",
              "@radix-ui/react-select",
              "@radix-ui/react-tabs",
              "@radix-ui/react-tooltip",
              "lucide-react",
              "framer-motion",
            ],
            query: ["@tanstack/react-query"],
            charts: ["recharts"],
          },
        },
      },
    },
    server: {
      headers: securityHeaders,
    },
    preview: {
      headers: securityHeaders,
    },
  }
})