import type { ReactNode } from "react"
import { Gauge } from "lucide-react"
import {
  partialCoverage,
  partialProfileDetail,
  partialProfileLabel,
} from "@/lib/job-fit/coverage"
import { displayFitPercent, fitPercentLabel, fitPercentTone, type FitPercentSource } from "./fit"
import { FitMeter } from "./primitives"
import { FitScoreFigure } from "./FitScoreFigure"
import type { JobOverall } from "@/types/job-fit/components"

/**
 * Where the headline sits:
 * - `summary` — Career Fit's "Your fit at a glance" and Fit a JD's result:
 *   figure, label, gauge icon, meter.
 * - `recorded` — a reopened report: figure with the label inline, meter.
 * - `ds` — Direction Setting's breakdown headline: figure, role title, label,
 *   and the partial-profile note inline.
 */
export type FitScoreHeadlineVariant = "summary" | "recorded" | "ds"

/**
 * The fit headline for ONE role (FIT-5). It reads the number itself, through
 * `displayFitPercent`, from the row or breakdown it is given — so no surface
 * can show a headline that disagrees with its list row (FIT-1).
 */
export function FitScoreHeadline({
  source,
  variant,
  title,
  overall,
}: {
  source: FitPercentSource
  variant: FitScoreHeadlineVariant
  /** `ds` only: the role's title beside the figure. */
  title?: ReactNode
  /**
   * `ds` only, FIT-5b: this role's Overall fit, passed only while
   * `fit_shared_display` and overall_fit are both on. The PRISM figure stays
   * the headline, as on Career Fit's role page; Overall fit is a line beneath.
   */
  overall?: JobOverall["overall"]
}) {
  const pct = displayFitPercent(source)
  switch (variant) {
    case "summary":
      return (
        <>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <FitScoreFigure value={pct} variant="headline" />
              <p className="text-sm font-medium text-[#374151]">{fitPercentLabel(pct)}</p>
            </div>
            <Gauge className="h-8 w-8 text-[#0D9488]" aria-hidden />
          </div>
          <FitMeter value={pct} tone={fitPercentTone(pct)} className="mb-4" />
        </>
      )
    case "recorded":
      return (
        <>
          <FitScoreFigure value={pct} variant="headline" className="mb-3">
            <span className="ml-3 text-sm font-medium text-[#374151]">{fitPercentLabel(pct)}</span>
          </FitScoreFigure>
          <FitMeter value={pct} tone={fitPercentTone(pct)} />
        </>
      )
    case "ds": {
      // BP-F5: a partial-profile score says what it rests on.
      const partial = partialCoverage(source)
      return (
        <>
          <FitScoreFigure value={pct} variant="headline-ds" />
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{title}</span>
            <span className="block text-sm text-muted-foreground">{fitPercentLabel(pct)}</span>
          </span>
          {partial && (
            <span role="note" className="block w-full text-xs text-muted-foreground">
              <span className="font-medium text-amber-700">{partialProfileLabel(partial)}.</span>{" "}
              {partialProfileDetail(partial)}
            </span>
          )}
          {overall && (
            <span data-fit-figure="overall" className="block w-full text-sm text-muted-foreground">
              {overall.score != null ? (
                <>
                  <span className="font-medium text-foreground">Overall fit {Math.round(overall.score)}%</span>
                  {" "}— your PRISM fit combined with your field, level, experience and goals. The
                  PRISM fit above is unchanged.
                </>
              ) : overall.status === "not_set_up" ? (
                "Overall fit isn't set up on this service yet — your PRISM fit above is your read."
              ) : (
                "Not enough about you to combine yet — add a résumé. Your PRISM fit above is your read."
              )}
            </span>
          )}
        </>
      )
    }
  }
}
