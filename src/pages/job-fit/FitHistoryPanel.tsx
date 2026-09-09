import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { History, ChevronRight } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitHistory, useSaveFitReport } from "@/hooks/job-fit/useFitHistory"
import {
  clearLegacySavedReports,
  legacyEntryToSaveBody,
  readLegacySavedReports,
} from "@/lib/job-fit/legacySavedReports"
import type { FitSnapshotSource, FitSnapshotSummary } from "@/types/job-fit"
import { FitCard, FitEmptyState, FitPill, FitSectionTitle } from "./_shared"
import { fitPercentTone } from "./_fit"

const SOURCE_LABEL: Record<FitSnapshotSource, string> = {
  matches: "Role matches",
  detail: "Role fit",
  target: "Pasted job description",
  saved: "Saved report",
}

function when(ts: string): string {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts : d.toLocaleString()
}

/** Where a row reopens: a role's live fit when it has one, else the stored snapshot. */
function reopenPath(row: FitSnapshotSummary): string {
  return row.jobId && row.source !== "saved" ? ROUTES.JOB_FIT.detail(row.jobId) : ROUTES.JOB_FIT.history(row.id)
}

/**
 * "Your fit reports" — the person's fit history from the server (JS-3): every
 * matches / role / pasted-JD read they made, newest first, plus their saves.
 * Each row reopens. On first render it imports whatever the old localStorage
 * "Save" left behind (once, then the key is removed).
 */
export function FitHistoryPanel() {
  const history = useFitHistory()
  const save = useSaveFitReport()
  const imported = useRef(false)

  useEffect(() => {
    if (imported.current) return
    imported.current = true
    const legacy = readLegacySavedReports()
    if (legacy.length === 0) return
    void Promise.allSettled(legacy.map((e) => save.mutateAsync(legacyEntryToSaveBody(e)))).then((results) => {
      // Only drop the key when every entry reached the server; otherwise it is retried next visit.
      if (results.every((r) => r.status === "fulfilled")) clearLegacySavedReports()
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time import on mount
  }, [])

  const rows = history.data ?? []

  return (
    <FitCard className="mt-6">
      <FitSectionTitle>Your fit reports</FitSectionTitle>
      {history.isLoading ? (
        <p className="text-sm text-[#6b7280]">Loading your fit reports…</p>
      ) : history.isError ? (
        <p className="text-sm text-[#b91c1c]">We couldn&apos;t load your fit reports right now.</p>
      ) : rows.length === 0 ? (
        <FitEmptyState>
          No fit reports yet. Every role fit you open, and every report you save, is kept here.
        </FitEmptyState>
      ) : (
        <ul className="divide-y divide-[#f1f3f5]">
          {rows.map((row) => (
            <li key={row.id}>
              <Link
                to={reopenPath(row)}
                className="group flex items-center gap-3 py-2.5 text-sm hover:text-[#0D9488]"
              >
                <History className="h-4 w-4 shrink-0 text-[#9ca3af]" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-[#1f2937]">
                    {row.roleTitle || (row.source === "matches" ? "Your role matches" : "Fit report")}
                  </span>
                  <span className="block text-xs text-[#6b7280]">
                    {SOURCE_LABEL[row.source] ?? row.source} · {when(row.computedAt)}
                  </span>
                </span>
                {row.fitScore != null && (
                  <FitPill tone={fitPercentTone(row.fitScore)}>{row.fitScore}% fit</FitPill>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-[#9ca3af] group-hover:text-[#0D9488]" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </FitCard>
  )
}
