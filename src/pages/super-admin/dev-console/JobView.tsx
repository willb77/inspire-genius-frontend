import { useTranslation } from "react-i18next";
import { Loader2, Square, StepForward } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCancelJob, useContinueJob, useJob, shouldPollJob } from "@/hooks/dev-console/useDevConsole";
import type { DevConsoleJob, DevConsoleMe } from "@/types/devConsole";
import { DevConsoleErrorAlert } from "./DevConsoleErrorAlert";
import { JobEventRow } from "./JobEvents";
import { outcomeNote } from "./devConsoleView";

interface JobViewProps {
  jobId: string;
  me: DevConsoleMe;
  prompt?: string;
}

/** A live job: polled every 1.5 s until it settles. */
export function JobView({ jobId, me, prompt }: JobViewProps) {
  const job = useJob(jobId);
  const cont = useContinueJob();
  const cancel = useCancelJob();
  return (
    <JobCard
      job={job.data}
      me={me}
      prompt={prompt}
      error={job.error}
      actionError={cont.error ?? cancel.error}
      onContinue={() => cont.mutate(jobId)}
      onCancel={() => cancel.mutate(jobId)}
      busy={cont.isPending || cancel.isPending}
    />
  );
}

interface JobCardProps {
  job: DevConsoleJob | undefined;
  me: DevConsoleMe;
  prompt?: string;
  error?: unknown;
  actionError?: unknown;
  onContinue?: () => void;
  onCancel?: () => void;
  busy?: boolean;
}

/** Renders one job's header, event stream and controls. Also used read-only for past sessions. */
export function JobCard({ job, me, prompt, error, actionError, onContinue, onCancel, busy }: JobCardProps) {
  const { t } = useTranslation("devConsole");
  const live = job ? shouldPollJob(job.status) : !error;
  const note = job ? outcomeNote(job) : null;
  const canCancel = Boolean(onCancel) && job && (live || job.status === "awaiting_continue");

  return (
    <div className="space-y-2 rounded-lg border p-3" data-testid="dev-console-job">
      {prompt ? <div className="whitespace-pre-wrap text-sm font-medium">{prompt}</div> : null}

      {job ? (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant={job.status === "error" ? "destructive" : "secondary"}>
            {t(`status.${job.status}`)}
          </Badge>
          {live ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
          <span>{t("job.steps", { steps: job.steps, cap: job.step_cap || me.step_cap })}</span>
          <span>{t("job.cost", { cost: (job.cost_usd ?? 0).toFixed(2) })}</span>
          <span>{job.model}</span>
          {job.commit_sha ? <code>{t("job.commit", { sha: job.commit_sha.slice(0, 10) })}</code> : null}
        </div>
      ) : null}

      <DevConsoleErrorAlert error={error} me={me} />

      {job && job.events.length === 0 && live ? (
        <div className="text-xs text-muted-foreground">{t("job.waiting")}</div>
      ) : null}

      <div className="space-y-1.5">
        {(job?.events ?? []).map((e) => (
          <JobEventRow key={e.seq} event={e} />
        ))}
      </div>

      {note ? (
        <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground" data-outcome={note}>
          {t(`job.${note}`)}
        </div>
      ) : null}

      {job?.status === "awaiting_continue" ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          {t("job.paused", { cap: job.step_cap || me.step_cap })}
        </div>
      ) : null}

      <DevConsoleErrorAlert error={actionError} me={me} inline />

      {job && (onContinue || onCancel) ? (
        <div className="flex gap-2">
          {job.status === "awaiting_continue" && onContinue ? (
            <Button size="sm" onClick={onContinue} disabled={busy}>
              <StepForward className="mr-1 size-4" aria-hidden="true" />
              {t("job.continue")}
            </Button>
          ) : null}
          {canCancel ? (
            <Button size="sm" variant="outline" onClick={onCancel} disabled={busy}>
              <Square className="mr-1 size-4" aria-hidden="true" />
              {t("job.cancel")}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
