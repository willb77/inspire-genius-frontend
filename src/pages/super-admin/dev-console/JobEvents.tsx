import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslation } from "react-i18next";
import { AlertOctagon, CircleDollarSign, FileCode2, ListChecks, ShieldAlert, Wrench } from "lucide-react";

import type { AnswerEvent, Citation, JobEvent } from "@/types/devConsole";
import { safeCitationUrl } from "./devConsoleView";

function citationLabel(c: Citation): string {
  if (!c.line_start) return c.path;
  return c.line_end && c.line_end !== c.line_start
    ? `${c.path}#L${c.line_start}-L${c.line_end}`
    : `${c.path}#L${c.line_start}`;
}

function Citations({ citations }: { citations: Citation[] }) {
  const { t } = useTranslation("devConsole");
  if (citations.length === 0) return null;
  return (
    <div className="mt-3 border-t pt-2">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("events.citations")}
      </div>
      <ul className="space-y-1 text-xs">
        {citations.map((c, i) => {
          const href = safeCitationUrl(c.url);
          const label = citationLabel(c);
          return (
            <li key={`${c.path}-${c.line_start}-${i}`} className="flex items-center gap-1.5">
              <FileCode2 className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-primary underline">
                  {label}
                </a>
              ) : (
                <span className="break-all">{label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Answer({ event }: { event: AnswerEvent }) {
  const { t } = useTranslation("devConsole");
  return (
    <div className="rounded-md border bg-card p-3" data-event="answer">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("events.answer")}
      </div>
      <div className="space-y-2 text-sm leading-relaxed [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-muted [&_pre]:p-2">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{event.markdown}</ReactMarkdown>
      </div>
      <Citations citations={event.citations ?? []} />
    </div>
  );
}

/**
 * One event in the stream. `blocked` is ALWAYS rendered, prominently — a
 * refusal the user cannot see reads as the console doing nothing.
 */
export function JobEventRow({ event }: { event: JobEvent }) {
  const { t } = useTranslation("devConsole");
  switch (event.type) {
    case "answer":
      return <Answer event={event} />;
    case "blocked":
      return (
        <div
          data-event="blocked"
          className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div>
            <div className="font-medium">{t("events.blocked", { tool: event.tool })}</div>
            <div>{event.reason}</div>
          </div>
        </div>
      );
    case "tool":
      return (
        <div data-event="tool" className="flex items-start gap-2 text-xs text-muted-foreground">
          <Wrench className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            <span className="font-medium text-foreground">{event.tool}</span>
            {event.summary ? ` — ${event.summary}` : null}
          </span>
        </div>
      );
    case "step":
      return (
        <div data-event="step" className="flex items-start gap-2 text-xs text-muted-foreground">
          <ListChecks className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {typeof event.step === "number" ? t("events.step", { step: event.step }) : null}
            {event.summary ? `${typeof event.step === "number" ? " — " : ""}${event.summary}` : null}
          </span>
        </div>
      );
    case "cost":
      return (
        <div data-event="cost" className="flex items-start gap-2 text-xs text-muted-foreground">
          <CircleDollarSign className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {typeof event.cost_usd === "number"
              ? t("events.cost", { cost: event.cost_usd.toFixed(2) })
              : event.summary}
          </span>
        </div>
      );
    case "error":
      return (
        <div
          role="alert"
          data-event="error"
          className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertOctagon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{event.description || event.message || event.code || t("events.error")}</span>
        </div>
      );
    default:
      return null;
  }
}
