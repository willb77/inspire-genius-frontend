/**
 * Sentry error tracking initialization.
 *
 * Configured via environment variables:
 *   VITE_SENTRY_DSN         — Sentry project DSN (required to enable)
 *   VITE_SENTRY_ENVIRONMENT — Environment name (default: "development")
 *   VITE_APP_VERSION        — Release version for source map association
 */
import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || "development",
    release: import.meta.env.VITE_APP_VERSION || "0.0.0",

    // Performance monitoring
    tracesSampleRate: 0.2, // 20% of transactions
    replaysSessionSampleRate: 0, // No session replays by default
    replaysOnErrorSampleRate: 1.0, // Capture replay on every error

    // Filter noisy errors
    ignoreErrors: [
      "ResizeObserver loop",
      "Network Error",
      "AbortError",
      "Load failed",
      "cancelled",
    ],

    beforeSend(event) {
      // Strip PII from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => {
          if (b.category === "xhr" || b.category === "fetch") {
            delete b.data?.request_body;
          }
          return b;
        });
      }
      return event;
    },
  });
}

export { Sentry };
