import { AlertTriangle } from "lucide-react";
import { useSystemStatus } from "@/hooks/agents/useSystemStatus";

/**
 * Phase C — Coexistence Harness banner.
 *
 * Polls /v1/agents/system-status every 30s. When the platform-wide
 * FEATURE_ECOSYSTEM_DISABLED kill-switch is engaged on the agent-engine,
 * surfaces a non-dismissable warning across the top of the app shell so
 * users know chat will fall back to the monolith path.
 *
 * Render-only. The actual fallback is handled by callers that gate on
 * `useSystemStatus().data?.ecosystem_enabled`.
 */
export function EcosystemStatusBanner() {
  const { data, isLoading, isError } = useSystemStatus();

  // Treat unreachable agent-engine as a degraded state too (non-fatal —
  // monolith still works), but only after the first fetch attempt.
  if (isLoading) return null;

  const ecosystemUp = !isError && data?.ecosystem_enabled === true;
  if (ecosystemUp) return null;

  const message = isError
    ? "Agent ecosystem is unreachable. Chat is running on the monolith fallback."
    : "Agent ecosystem is temporarily disabled. Chat is running on the monolith fallback.";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-0 right-0 top-[var(--spacing-header-h)] z-40 flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-sm text-amber-900 shadow-sm"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
