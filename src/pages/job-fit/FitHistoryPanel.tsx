import { useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { History, ChevronRight } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { ROUTES } from "@/constants/routes"
import { useFitHistory, useSaveFitReport } from "@/hooks/job-fit/useFitHistory"
import {
  clearLegacySavedReports,
  legacyEntryToSaveBody,
  readLegacySavedReports,
} from "@/lib/job-fit/legacySavedReports"
import type { FitSnapshotSource, FitSnapshotSummary } from "@/types/job-fit"
import { FitCard, FitEmptyState, FitPill, FitSectionTitle } from "@/components/fit/primitives"
import { fitPercentTone } from "@/components/fit/fit"

function sourceLabel(source: FitSnapshotSource, t: TFunction): string {
  switch (source) {
    case "matches":
      return t("fitHistoryPanel.sourceMatches", "Role matches")
    case "detail":
      return t("fitHistoryPanel.sourceDetail", "Role fit")
    case "target":
      return t("fitHistoryPanel.sourceTarget", "Pasted job description")
    case "saved":
      return t("fitHistoryPanel.sourceSaved", "Saved report")
    default:
      return source
  }
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
  const { t } = useTranslation("jobFitPages")
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
      <FitSectionTitle>{t("fitHistoryPanel.title", "Your fit reports")}</FitSectionTitle>
      {history.isLoading ? (
        <p className="text-sm text-[#6b7280]">
          {t("fitHistoryPanel.loading", "Loading your fit reports…")}
        </p>
      ) : history.isError ? (
        <p className="text-sm text-[#b91c1c]">
          {t("fitHistoryPanel.loadError", "We couldn't load your fit reports right now.")}
        </p>
      ) : rows.length === 0 ? (
        <FitEmptyState>
          {t(
            "fitHistoryPanel.empty",
            "No fit reports yet. Every role fit you open, and every report you save, is kept here.",
          )}
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
                    {row.roleTitle ||
                      (row.source === "matches"
                        ? t("fitHistoryPanel.yourRoleMatches", "Your role matches")
                        : t("fitHistoryPanel.fitReport", "Fit report"))}
                  </span>
                  <span className="block text-xs text-[#6b7280]">
                    {sourceLabel(row.source, t)} · {when(row.computedAt)}
                  </span>
                </span>
                {row.fitScore != null && (
                  <FitPill tone={fitPercentTone(row.fitScore)}>{t("fitHistoryPanel.fitPercent", {
                      defaultValue: "{{pct}}% fit",
                      pct: row.fitScore,
                    })}
                  </FitPill>
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
