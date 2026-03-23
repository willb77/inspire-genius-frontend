import * as Sentry from "@sentry/react";
import type { ReactNode } from "react";

function FallbackUI({ error, resetError }: { error: Error; resetError: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold text-foreground">Something went wrong</h1>
        <p className="text-muted-foreground">
          An unexpected error occurred. Our team has been notified.
        </p>
        {import.meta.env.DEV && (
          <pre className="mt-4 rounded bg-muted p-4 text-left text-xs text-destructive overflow-auto max-h-40">
            {error.message}
          </pre>
        )}
        <div className="flex gap-3 justify-center pt-2">
          <button
            onClick={resetError}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <FallbackUI error={error instanceof Error ? error : new Error(String(error))} resetError={resetError} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
