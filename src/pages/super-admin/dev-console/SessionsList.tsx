import { useTranslation } from "react-i18next";
import { MessagesSquare } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useSessions } from "@/hooks/dev-console/useDevConsole";
import type { DevConsoleMe } from "@/types/devConsole";
import { DevConsoleErrorAlert } from "./DevConsoleErrorAlert";

const when = (iso: string | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
};

interface SessionsListProps {
  me: DevConsoleMe;
  currentSessionId: string | null;
  onOpen: (sessionId: string) => void;
}

/** The caller's own sessions, newest first as the server returns them. */
export function SessionsList({ me, currentSessionId, onOpen }: SessionsListProps) {
  const { t } = useTranslation("devConsole");
  const sessions = useSessions();

  return (
    <section className="space-y-2" aria-labelledby="dc-sessions-title">
      <h3 id="dc-sessions-title" className="text-sm font-semibold">
        {t("sessions.title")}
      </h3>
      <DevConsoleErrorAlert error={sessions.error} me={me} />
      {sessions.isLoading ? <Skeleton className="h-16 w-full" /> : null}
      {sessions.data && sessions.data.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("sessions.empty")}</p>
      ) : null}
      <ul className="space-y-1">
        {(sessions.data ?? []).map((s) => (
          <li key={s.session_id}>
            <button
              type="button"
              onClick={() => onOpen(s.session_id)}
              aria-current={s.session_id === currentSessionId ? "true" : undefined}
              className={cn(
                "w-full rounded-md border px-2 py-1.5 text-left text-xs hover:bg-muted",
                s.session_id === currentSessionId && "border-primary bg-muted"
              )}
            >
              <div className="flex items-center gap-1.5 font-medium text-foreground">
                <MessagesSquare className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{s.title || s.session_id.slice(0, 8)}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-muted-foreground">
                <span>{s.repo}</span>
                <span>{t("sessions.turns", { count: s.jobs })}</span>
                <span>${(s.cost_usd ?? 0).toFixed(2)}</span>
                {s.ticket_id ? <span>{t("sessions.ticket", { ticket: s.ticket_id })}</span> : null}
                <span>{when(s.last_at)}</span>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
