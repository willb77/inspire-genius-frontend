import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

import { DEV_CONSOLE_QK } from "@/hooks/dev-console/useDevConsole";
import type { DevConsoleMe } from "@/types/devConsole";
import { describeDevConsoleError } from "./devConsoleError";

interface DevConsoleErrorAlertProps {
  error: unknown;
  me?: DevConsoleMe | null;
  /** Rendered as a quieter inline notice rather than a red alert. */
  inline?: boolean;
}

/**
 * Renders ANY console failure — query or mutation — as its contract text with
 * `role="alert"`. A surface that cannot say "that failed" is indistinguishable
 * from one that is merely slow (agents.md §6), so every hook's `error` in the
 * panel goes through here.
 *
 * A 403 that means "you may not use the console" re-checks access, which hides
 * the tab; a 401 renders nothing because the shared interceptor is already
 * redirecting to sign-in.
 */
export function DevConsoleErrorAlert({ error, me, inline = false }: DevConsoleErrorAlertProps) {
  const { t } = useTranslation("devConsole");
  const qc = useQueryClient();
  const view = error ? describeDevConsoleError(error, t, me) : null;
  const hidden = view?.kind === "hidden";

  useEffect(() => {
    if (hidden) void qc.invalidateQueries({ queryKey: DEV_CONSOLE_QK.me });
  }, [hidden, qc]);

  if (!view || view.kind !== "message") return null;
  return (
    <div
      role="alert"
      data-code={view.code}
      className={
        inline
          ? "rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
          : "flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
      }
    >
      {inline ? null : <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />}
      <span>{view.text}</span>
    </div>
  );
}
