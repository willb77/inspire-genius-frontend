import { MessageSquareText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { DossierInterviews } from "@/types/development"

/**
 * S-3 — development interviews on the member's record, as summaries only.
 *
 * Three states, each said in words, because the empty list is the one output
 * that cannot tell them apart:
 *  - not_shared  — the member has not shared interviews with you;
 *  - unavailable — the read failed or sharing is switched off on this tier;
 *  - shared      — with or without any interviews yet.
 * Only development / discovery interviews ever appear here — never a
 * selection interview (D3).
 */
export function InterviewsPanel({
  interviews,
  memberName,
}: {
  interviews?: DossierInterviews
  memberName: string
}) {
  const state = interviews?.state ?? "unavailable"
  const items = interviews?.items ?? []
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquareText className="h-4 w-4 text-indigo-600" /> Development interviews
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {state === "not_shared" && (
          <p className="text-sm text-slate-600" data-testid="interviews-not-shared">
            {memberName} hasn't shared their interviews with you. They can choose to from their
            Sharing page.
          </p>
        )}
        {state === "unavailable" && (
          <p className="text-sm text-amber-700" role="status" data-testid="interviews-unavailable">
            Interviews couldn't be loaded right now. This isn't the same as having none.
          </p>
        )}
        {state === "shared" && items.length === 0 && (
          <p className="text-sm text-slate-600" data-testid="interviews-none-yet">
            No development interviews with {memberName} yet.
          </p>
        )}
        {state === "shared" &&
          items.map((it) => (
            <div key={it.sessionId} className="rounded-md border border-slate-200 p-3" data-testid="interview-item">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium text-slate-900">{it.title || "Development interview"}</span>
                <span className="text-xs text-slate-500">
                  {it.finalizedAt ? new Date(it.finalizedAt).toLocaleDateString() : ""}
                </span>
              </div>
              {(it.overallScore != null || it.recommendation) && (
                <p className="mt-1 text-xs text-slate-600">
                  {it.overallScore != null ? `Overall ${it.overallScore.toFixed(1)}` : ""}
                  {it.overallScore != null && it.recommendation ? " · " : ""}
                  {it.recommendation ?? ""}
                </p>
              )}
              {it.summary ? <p className="mt-2 text-sm text-slate-700">{it.summary}</p> : null}
            </div>
          ))}
      </CardContent>
    </Card>
  )
}
