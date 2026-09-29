/**
 * ScorecardDraftCard — JS-11: a scorecard DRAFTED by a finalised interview,
 * shown on the Scorecards page with a link back to the session that wrote it.
 *
 * A draft is evidence, not a result: no total, no band. What the interviewer
 * needs is to know it exists, what it covers, and where it came from — the
 * session — so they can review the interview before scoring the candidate.
 */
import { Link } from "react-router-dom"
import { ClipboardList, ExternalLink } from "lucide-react"

import type { ScorecardDraft } from "@/types/job-blueprint"

type Props = {
  draft: ScorecardDraft
  /** Where the session opens for this user's role, or null when the role has no Live Interview page. */
  sessionHref: string | null
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString()
}

export function ScorecardDraftCard({ draft, sessionHref }: Props) {
  const scored =
    draft.behaviorScores.length +
    draft.counterProductiveScores.length +
    draft.aptitudeScores.length +
    draft.coreTraitScores.length
  return (
    <div
      className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950"
      data-testid="scorecard-draft-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 font-medium">
            <ClipboardList className="h-4 w-4" aria-hidden /> Draft from a finalised interview
          </div>
          <p className="mt-1 text-xs text-indigo-900/80">
            Written {fmtDate(draft.createdAt)} · {scored} dimension{scored === 1 ? "" : "s"} scored · not yet
            submitted, so it does not count.
          </p>
        </div>
        {sessionHref ? (
          <Link
            to={sessionHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-indigo-300 bg-white px-3 py-1.5 text-xs font-medium text-indigo-900 hover:bg-indigo-100"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open the interview
          </Link>
        ) : draft.interviewSessionId ? (
          <span className="text-xs text-indigo-900/70">Interview session {draft.interviewSessionId.slice(0, 8)}…</span>
        ) : null}
      </div>
      {draft.notes ? <p className="mt-2 whitespace-pre-line text-xs text-indigo-900/80">{draft.notes}</p> : null}
    </div>
  )
}
