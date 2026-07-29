import { useEffect, useRef } from "react"
import { Gauge, Sprout } from "lucide-react"
import type { FitDetail } from "@/types/job-fit"
import { useExplainFit } from "@/hooks/job-fit/useExplainFit"
import { toExplainBody } from "@/services/job-fit/explain.service"
import { FitCard, FitSectionTitle, FitMeter } from "./_shared"
import {
  fitPercent,
  fitPercentTone,
  fitPercentLabel,
  variationDescriptor,
} from "./_fit"

/**
 * Fit Summary — the plain-language read of the job↔person overlay.
 *
 * Shows an explicit 1-100 fit percentage (higher = closer; NEVER a fit/no-fit
 * badge), a short LLM description of what the overlay shows, and a
 * "where the gaps are + how to close them" list. The numbers are authoritative
 * (the fit %/gaps come from blueprint-service); the agent-engine only narrates.
 * If the narration call fails, a deterministic, non-binary fallback renders so
 * the card is never blank.
 */
export function FitSummaryCard({ data }: { data: FitDetail }) {
  const explain = useExplainFit()
  const pct = fitPercent(data.fitScore, data.totalVariation, data.perDimension.length || 22)
  const firedFor = useRef<string | null>(null)

  // Fetch the overview once per role (no follow-up question). A ref guards
  // against duplicate fires under React 18 strict-mode double-invoke.
  useEffect(() => {
    if (firedFor.current === data.jobId) return
    firedFor.current = data.jobId
    explain.mutate(toExplainBody(data, pct))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.jobId])

  const result = explain.data
  const overview =
    result?.overview?.trim() ||
    (explain.isPending
      ? ""
      : `${fitPercentLabel(pct)} — about ${pct}% aligned overall. ${variationDescriptor(
          data.totalVariation
        )}.`)
  const gaps = result?.gaps?.length ? result.gaps : null

  return (
    <FitCard className="mb-6">
      <FitSectionTitle>Your fit at a glance</FitSectionTitle>

      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-[#1f2937]">{pct}</span>
            <span className="text-lg font-semibold text-[#6b7280]">%</span>
          </div>
          <p className="text-sm font-medium text-[#374151]">{fitPercentLabel(pct)}</p>
        </div>
        <Gauge className="h-8 w-8 text-[#0D9488]" />
      </div>

      <FitMeter value={pct} tone={fitPercentTone(pct)} className="mb-4" />

      {explain.isPending ? (
        <div className="space-y-2" aria-hidden>
          <div className="h-3 w-full animate-pulse rounded bg-[#eef1f4]" />
          <div className="h-3 w-11/12 animate-pulse rounded bg-[#eef1f4]" />
          <div className="h-3 w-3/4 animate-pulse rounded bg-[#eef1f4]" />
        </div>
      ) : (
        <p className="text-sm leading-relaxed text-[#374151]">{overview}</p>
      )}

      {gaps && (
        <div className="mt-5">
          <FitSectionTitle>Where the gaps are — and how to close them</FitSectionTitle>
          <div className="space-y-3">
            {gaps.map((g, i) => (
              <div key={`${g.dimension}-${i}`} className="rounded-lg border border-[#e5e7eb] p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-[#0f766e]" />
                  <span className="text-sm font-medium text-[#1f2937]">{g.dimension}</span>
                </div>
                {g.plain && <p className="text-sm text-[#4b5563]">{g.plain}</p>}
                {g.howToClose && (
                  <p className="mt-1 text-sm text-[#0f766e]">
                    <span className="font-medium">To close it:</span> {g.howToClose}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result?.disclaimer && (
        <p className="mt-4 text-xs leading-relaxed text-[#9ca3af]">{result.disclaimer}</p>
      )}
    </FitCard>
  )
}
