import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Terminal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  shouldPollJob,
  useDevConsoleRepos,
  useJob,
  useSession,
  useStartJob,
} from "@/hooks/dev-console/useDevConsole";
import { registerDevConsoleI18n } from "@/i18n/devConsole";
import type { DevConsoleMe } from "@/types/devConsole";
import { AccessPanel } from "./AccessPanel";
import { AttachToTicket } from "./AttachToTicket";
import { DevConsoleErrorAlert } from "./DevConsoleErrorAlert";
import { JobCard, JobView } from "./JobView";
import { PromptForm, type PromptValues } from "./PromptForm";
import { SessionsList } from "./SessionsList";

// Idempotent; SupportTabs has normally registered the namespace already.
registerDevConsoleI18n();

type Turn = { jobId: string; prompt: string };

const usd = (n: number | undefined): string => (typeof n === "number" ? n.toFixed(2) : "?");

interface DevConsolePanelProps {
  /** The access probe's body — the panel is only ever mounted when `allowed` is true. */
  me: DevConsoleMe;
}

/**
 * Help & Support → Claude Code (CC.3).
 *
 * A read-only question about one of the D2 repositories is sent as a JOB and
 * polled every 1.5 s until it settles (agents.md §6 — no socket). The event
 * stream shows each step, tool call and refusal; the answer cites files at the
 * commit it was read from.
 */
export default function DevConsolePanel({ me }: DevConsolePanelProps) {
  const { t } = useTranslation("devConsole");
  const repos = useDevConsoleRepos();
  const start = useStartJob();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);

  const history = useSession(sessionId);
  const liveIds = new Set(turns.map((x) => x.jobId));
  const pastJobs = (history.data?.jobs ?? []).filter((j) => !liveIds.has(j.job_id));

  const lastJobId = turns.length ? turns[turns.length - 1].jobId : null;
  const lastJob = useJob(lastJobId);
  const busy = Boolean(lastJobId) && (lastJob.data ? shouldPollJob(lastJob.data.status) : !lastJob.error);

  const send = async (values: PromptValues): Promise<boolean> => {
    const repo = (repos.data ?? []).find((r) => r.key === values.repo);
    try {
      const res = await start.mutateAsync({
        repo: values.repo,
        prompt: values.prompt.trim(),
        model: values.model,
        ref: values.ref.trim() || repo?.default_branch || "development",
        session_id: sessionId,
        ticket_id: null,
      });
      setSessionId(res.session_id);
      setTurns((prev) => [...prev, { jobId: res.job_id, prompt: values.prompt.trim() }]);
      return true;
    } catch {
      // `start.error` holds it and is rendered below.
      return false;
    }
  };

  const openSession = (id: string) => {
    start.reset();
    setTurns([]);
    setSessionId(id);
  };

  const newSession = () => {
    start.reset();
    setTurns([]);
    setSessionId(null);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="min-w-0 space-y-4">
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Terminal className="size-5" aria-hidden="true" />
                <h2 className="text-lg font-semibold">{t("panel.title")}</h2>
                <Badge variant="outline">{t("panel.mode", { mode: me.mode })}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {t("panel.budget", {
                  spent: usd(me.budget?.spent_today_usd),
                  cap: usd(me.budget?.daily_cap_usd),
                })}
                {" · "}
                {t("panel.jobCap", { cap: usd(me.budget?.job_cap_usd) })}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">{t("panel.subtitle")}</p>

            {!me.enabled ? (
              <div
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                {t("errors.CONSOLE_DISABLED")}
              </div>
            ) : null}

            <DevConsoleErrorAlert error={repos.error} me={me} />
            {repos.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <PromptForm
                repos={repos.data ?? []}
                models={me.models ?? []}
                defaultModel={me.default_model}
                disabled={!me.enabled || busy}
                pending={start.isPending}
                onSubmit={send}
              />
            )}
            <DevConsoleErrorAlert error={start.error} me={me} />

            {sessionId ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{t("form.continuing")}</span>
                <Button type="button" size="sm" variant="ghost" onClick={newSession}>
                  <Plus className="mr-1 size-3.5" aria-hidden="true" />
                  {t("form.newSession")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <DevConsoleErrorAlert error={history.error} me={me} />
        {pastJobs.map((j) => (
          <JobCard key={j.job_id} job={j} me={me} />
        ))}
        {turns.map((turn) => (
          <JobView key={turn.jobId} jobId={turn.jobId} me={me} prompt={turn.prompt} />
        ))}
      </div>

      <aside className="space-y-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <SessionsList me={me} currentSessionId={sessionId} onOpen={openSession} />
            {sessionId ? <AttachToTicket sessionId={sessionId} me={me} /> : null}
          </CardContent>
        </Card>
        {me.owner ? (
          <Card>
            <CardContent className="p-4">
              <AccessPanel me={me} />
            </CardContent>
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
