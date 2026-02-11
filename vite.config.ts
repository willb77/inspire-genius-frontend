import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_")
  const isDev = mode === "development"

  // ── URLs from environment (.env / .env.production / etc.) ────
  const apiBase = env.VITE_API_BASE_URL || "http://localhost:5173"
  const wsAgents = env.VITE_AGENTS_WEBSOCKET_BASE_URL || ""
  const wsAlex = env.VITE_ALEX_WEB_SOCKET_URL || ""

  // ── Content-Security-Policy ──────────────────────────────────
  // Dev needs unsafe-inline / unsafe-eval for Vite HMR
  const scriptSrc = isDev
    ? "'self' 'unsafe-inline' 'unsafe-eval'"
    : "'self'"

  const connectSrc = ["'self'", apiBase, wsAgents, wsAlex]
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
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
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