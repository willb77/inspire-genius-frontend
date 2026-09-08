/**
 * PastInterviewsPanel — the interviewer's own past interviews, on the setup
 * screen of both interviewer-side bodies.
 *
 * Package IS-C Lane B. Until this existed, closing the tab orphaned an
 * `in_progress` session that no surface could reach: the row stayed in the
 * database, the answers stayed with it, and the interviewer's only route back
 * was to start again from the consent gate.
 *
 * ONE component, mounted by both `LiveInterviewBody` and
 * `StudioInterviewBody`. The two bodies were forked verbatim from each other,
 * and the last defect that lived in both (IS-F13's forever-spinner) had to be
 * fixed twice because of it — fixing one and leaving the other stuck and green
 * is exactly the failure this shares code to avoid.
 */
import { useState } from "react"
import { AlertTriangle, History, Loader2, PlayCircle, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAbandonLiveSession, useLiveSessions } from "@/hooks/interview/useLiveSessions"
import { candidateLabel, formatWhen } from "@/components/interview/pastInterviewsFormat"
import type { LiveSessionSummary } from "@/services/interview/live.service"

const STATUS_STYLE: Record<string, string> = {
  in_progress: "bg-amber-100 text-amber-900",
  finalized: "bg-emerald-100 text-emerald-900",
  abandoned: "bg-slate-200 text-slate-700",
}

const STATUS_LABEL: Record<string, string> = {
  in_progress: "In progress",
  finalized: "Finalized",
  abandoned: "Abandoned",
}

export type PastInterviewsPanelProps = {
  /** Only affects wording — the data and the routes are the same. */
  surface: "live" | "studio"
  /** Continue an `in_progress` session at its first unanswered question. */
  onResume: (sessionId: string) => void
  /** Open a finalized (or abandoned) session read-only. */
  onReopen: (sessionId: string) => void
  /** The row the parent is currently loading, so it can show its own spinner. */
  busySessionId?: string | null
}

export default function PastInterviewsPanel({
  surface,
  onResume,
  onReopen,
  busySessionId = null,
}: PastInterviewsPanelProps) {
  const { data, isLoading, error, refetch, isFetching } = useLiveSessions({ limit: 25 })
  const abandon = useAbandonLiveSession()
  const [abandoning, setAbandoning] = useState<string | null>(null)

  const noun = surface === "studio" ? "practice interviews" : "interviews"

  const handleAbandon = async (s: LiveSessionSummary) => {
    if (
      !window.confirm(
        `Abandon the interview with ${candidateLabel(s)}? The answers and ratings already saved are kept, ` +
          `but the interview is closed unfinished and cannot be scored.`,
      )
    ) {
      return
    }
    setAbandoning(s.id)
    try {
      await abandon.mutateAsync(s.id)
      toast.success("Interview marked abandoned.")
    } catch (e) {
      // Never a silent failure: the row stays in_progress and the list is
      // refetched either way, so what the interviewer sees matches the server.
      toast.error(e instanceof Error && e.message ? e.message : "Could not abandon that interview.")
    } finally {
      setAbandoning(null)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-indigo-600" /> Past {noun}
          </CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            Pick up an unfinished interview where you left it, or reopen a finished one to
            review and re-export it.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="sr-only">Refresh</span>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <p className="flex items-center py-4 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your past interviews…
          </p>
        ) : error ? (
          <div className="space-y-2 rounded-md border border-rose-200 bg-rose-50/60 p-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-rose-900">
              <AlertTriangle className="h-4 w-4" /> Your past interviews could not be loaded.
            </p>
            <p className="text-xs text-rose-800">
              This is a loading failure, not an empty history — nothing has been lost. You can
              still start a new interview below.
            </p>
            <Button size="sm" variant="outline" onClick={() => void refetch()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Try again
            </Button>
          </div>
        ) : (data?.sessions.length ?? 0) === 0 ? (
          <p className="py-4 text-sm text-slate-500">
            You haven&apos;t run any interviews yet. The first one will appear here as soon as
            it starts — including if you close the tab part-way through.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data!.sessions.map((s) => {
              const busy = busySessionId === s.id
              const isAbandoning = abandoning === s.id
              const resumable = s.status === "in_progress"
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {candidateLabel(s)}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
                      <span>{formatWhen(s.created_at)}</span>
                      {s.frame?.roleTitle && <span>· {s.frame.roleTitle}</span>}
                      {s.frame?.mode && <span>· {s.frame.mode}</span>}
                      {s.requisition_label && <span>· {s.requisition_label}</span>}
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          STATUS_STYLE[s.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {resumable ? (
                      <>
                        <Button size="sm" onClick={() => onResume(s.id)} disabled={busy || isAbandoning}>
                          {busy ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <PlayCircle className="mr-2 h-4 w-4" />
                          )}
                          Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => void handleAbandon(s)}
                          disabled={busy || isAbandoning}
                        >
                          {isAbandoning ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Abandon
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => onReopen(s.id)} disabled={busy}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Reopen
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {data && !data.org_scope_applied && (
          /* IS-F15. `org_id` is written from a claim real tokens do not carry,
             so the org clause matches nothing and a company-admin's list is
             their OWN interviews. Saying so is the difference between an honest
             list and one that reads as the whole organisation's. */
          <p className="border-t border-slate-100 pt-3 text-xs text-slate-500">
            This list is the interviews <span className="font-medium">you</span> ran. Your sign-in
            did not carry an organisation, so colleagues&apos; interviews are not included even if
            you administer their organisation.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
