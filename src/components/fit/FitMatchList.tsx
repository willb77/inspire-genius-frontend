import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { AlertTriangle, Building2, ChevronRight, Target } from "lucide-react"
import { cn } from "@/lib/utils"
import { partialCoverage, partialProfileDetail } from "@/lib/job-fit/coverage"
import type { FitMatch } from "@/types/job-fit"
import type { JobComponents } from "@/types/job-fit/components"
import {
  displayFitPercent,
  fitDetailPath,
  fitListContexts,
  fitPercentTone,
  type FitListContext,
} from "./fit"
import { FitCard, FitPill } from "./primitives"
import { VERDICT_LABEL, VERDICT_TONE, asOverall, asV1 } from "./components"
import { FitScoreFigure } from "./FitScoreFigure"

/**
 * The three kinds of list that rank roles by fit:
 * - `career` — Career Fit's "Your Role Matches": each row links to the role's
 *   breakdown, with the goal chip, composite and Overall fit when those are on.
 * - `ds` — Direction Setting's Job matches: each row is a button that opens the
 *   breakdown in place, with the critical-gap count.
 * - `recorded` — a reopened matches report: the roles as ranked that day.
 */
export type FitMatchListVariant = "career" | "ds" | "recorded"

type RowCommon = {
  match: FitMatch
  /**
   * FIT-4a seam: where this row sits in its list. Computed by `FitMatchList`;
   * nothing renders it yet (FIT-5 adds the seam, FIT-4b decides its use).
   */
  context?: FitListContext
}

export type FitMatchRowProps =
  | (RowCommon & { variant: "career"; components?: JobComponents })
  | (RowCommon & { variant: "ds"; selected: boolean; onSelect: (jobId: string) => void })
  | (RowCommon & { variant: "recorded" })

/** One ranked role. Its % is always `displayFitPercent(match)` (FIT-1). */
export function FitMatchRow(props: FitMatchRowProps) {
  const { match } = props
  const pct = displayFitPercent(match)
  // BP-F5: a partial-profile score says how much it rests on.
  const partial = partialCoverage(match)

  if (props.variant === "recorded") {
    return (
      <li className="flex items-center gap-3 py-2 text-sm">
        <Target className="h-4 w-4 shrink-0 text-[#9ca3af]" aria-hidden />
        <Link to={fitDetailPath(match.jobId, match.method)} className="min-w-0 flex-1 truncate font-medium text-[#1f2937] hover:text-[#0D9488]">
          {match.roleTitle}
        </Link>
        <FitPill tone={fitPercentTone(pct)}>{pct}% fit</FitPill>
      </li>
    )
  }

  if (props.variant === "ds") {
    const { selected, onSelect } = props
    return (
      <li>
        <button
          type="button"
          onClick={() => onSelect(match.jobId)}
          aria-pressed={selected}
          className={cn(
            "flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-colors",
            selected
              ? "border-primary bg-primary/5"
              : "border-border bg-background hover:border-primary/50"
          )}
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{match.roleTitle}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {match.department && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" aria-hidden />
                  {match.department}
                </span>
              )}
              {/* The critical-gap count stays: "you are close, with N specific
                  things to close" is useful where a tier label is not. */}
              {(match.criticalGapCount ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="h-3 w-3" aria-hidden />
                  {match.criticalGapCount} critical gap
                  {match.criticalGapCount === 1 ? "" : "s"} to close
                </span>
              )}
            </span>
          </span>

          <span className="shrink-0 text-right">
            <FitScoreFigure value={pct} variant="row-ds" />
            <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-muted-foreground">
              fit
            </span>
            {partial && (
              <span className="mt-1 block text-[11px] text-amber-700" title={partialProfileDetail(partial)}>
                {partial.evaluated} of {partial.total} measured
              </span>
            )}
          </span>
        </button>
      </li>
    )
  }

  // career
  const { components } = props
  // Feeds Phase 2: a verdict chip only when the role is scored against a goal —
  // an unlinked role shows nothing rather than a warning.
  const goal = components?.status === "ok" ? components.goalAlignment : undefined
  const composite = asV1(components)?.composite
  // FIT-3: present only while the server's overall_fit switch is on.
  const overall = asOverall(components)?.overall
  return (
    <Link
      to={fitDetailPath(match.jobId, match.method)}
      className="group flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white p-4 transition-colors hover:border-[#0D9488]"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-semibold text-[#1f2937]">{match.roleTitle}</span>
          {goal?.status === "scored" && (
            <FitPill tone={VERDICT_TONE[goal.verdict]}>{VERDICT_LABEL[goal.verdict]}</FitPill>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
          {match.department && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {match.department}
            </span>
          )}
          {/* No fit tier here (4.1, option D): the score and the order carry it. */}
        </div>
      </div>
      {overall ? (
        <OverallFitFigure overall={overall} pct={pct} partial={partial} />
      ) : (
        <div className="shrink-0 text-right">
          <FitScoreFigure value={pct} variant="row" />
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">fit</div>
          {partial && (
            <div className="mt-1 text-[11px] text-[#b45309]" title={partialProfileDetail(partial)}>
              {partial.evaluated} of {partial.total} measured
            </div>
          )}
          {composite?.score != null && (
            <div className="mt-1 text-[11px] text-[#6b7280]" title="Behavioural fit, goals and experience combined">
              {Math.round(composite.score)}% composite
            </div>
          )}
        </div>
      )}
      <ChevronRight className="h-5 w-5 shrink-0 text-[#9ca3af] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0D9488]" />
    </Link>
  )
}

/**
 * FIT-3 — a Career Fit row's figure while Overall fit is on: "Overall fit N%"
 * as the headline with "PRISM fit N%" beneath. A role with no Overall fit (too
 * little known about the person to combine) shows its PRISM fit, labelled as
 * such. Moved unchanged from `pages/job-fit/MatchesPage.tsx` by FIT-5a.
 */
function OverallFitFigure({
  overall,
  pct,
  partial,
}: {
  overall: NonNullable<ReturnType<typeof asOverall>>["overall"]
  pct: number
  partial: ReturnType<typeof partialCoverage>
}) {
  const score = overall.score
  return (
    <div className="shrink-0 text-right">
      {score != null ? (
        <>
          <FitScoreFigure value={Math.round(score)} variant="row" />
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">Overall fit</div>
          <div className="mt-1 text-[11px] text-[#6b7280]">PRISM fit {pct}%</div>
        </>
      ) : (
        <>
          <FitScoreFigure value={pct} variant="row" />
          <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">PRISM fit</div>
          {overall.status !== "not_set_up" && (
            <div className="mt-1 max-w-[11rem] text-[11px] text-[#6b7280]">
              Not enough about you to combine — add a résumé
            </div>
          )}
        </>
      )}
      {partial && (
        <div className="mt-1 text-[11px] text-[#b45309]" title={partialProfileDetail(partial)}>
          {partial.evaluated} of {partial.total} measured
        </div>
      )}
    </div>
  )
}

/** The page state a list is drawn in. Absent = loaded, not gated. */
export type FitMatchListState = {
  isLoading?: boolean
  isError?: boolean
  /** Matching switched off platform-side (FIT-1). */
  gated?: boolean
  /**
   * Decision 8: what "gated" does is the surface's call, not one shared rule.
   * Direction Setting hides the rows behind its paused card (`true`); Career
   * Fit shows the rows with a note (`false`).
   */
  gatedHidesRows?: boolean
}

/** Each surface's own words for each state. A slot left out renders nothing. */
export type FitMatchListSlots = {
  loading?: ReactNode
  error?: ReactNode
  /** Gated, and either there are no rows or the surface hides them. */
  gated?: ReactNode
  /** Gated, with rows shown (only when `gatedHidesRows` is false). */
  gatedNote?: ReactNode
  /** Not gated, and nothing to rank. */
  empty?: ReactNode
  /** Above the rows, whenever rows are shown. */
  beforeList?: ReactNode
  /** Wraps the rendered list, e.g. in a section with its own heading. */
  wrapList?: (list: ReactNode) => ReactNode
}

type ListCommon = { matches: FitMatch[]; state?: FitMatchListState; slots?: FitMatchListSlots }

export type FitMatchListProps =
  | (ListCommon & { variant: "career"; components?: Record<string, JobComponents> })
  | (ListCommon & { variant: "ds"; selectedId: string | null; onSelect: (jobId: string) => void })
  | (ListCommon & { variant: "recorded" })

/**
 * A list of roles ranked by fit, in the order it is given — FIT-5 never
 * reorders (FIT-3-F1, decision 7). Renders the surface's loading / error /
 * gated / empty slots in one fixed order, then the rows.
 */
export function FitMatchList(props: FitMatchListProps) {
  const { matches, state = {}, slots = {} } = props
  const { isLoading = false, isError = false, gated = false, gatedHidesRows = false } = state
  const n = matches.length
  const settled = !isLoading && !isError
  const showRows = settled && n > 0 && !(gated && gatedHidesRows)
  const contexts = fitListContexts(matches)

  const rows = matches.map((m, i) => {
    switch (props.variant) {
      case "career":
        return (
          <FitMatchRow
            key={m.jobId}
            variant="career"
            match={m}
            components={props.components?.[m.jobId]}
            context={contexts[i]}
          />
        )
      case "ds":
        return (
          <FitMatchRow
            key={m.jobId}
            variant="ds"
            match={m}
            selected={m.jobId === props.selectedId}
            onSelect={props.onSelect}
            context={contexts[i]}
          />
        )
      case "recorded":
        return <FitMatchRow key={m.jobId} variant="recorded" match={m} context={contexts[i]} />
    }
  })

  const list =
    props.variant === "career" ? (
      <FitCard className="space-y-3 p-4">{rows}</FitCard>
    ) : props.variant === "ds" ? (
      <ul className="space-y-2">{rows}</ul>
    ) : (
      <ul className="divide-y divide-[#f1f3f5]">{rows}</ul>
    )

  return (
    <>
      {isLoading && slots.loading}
      {isError && slots.error}
      {settled && gated && (gatedHidesRows || n === 0) && slots.gated}
      {settled && gated && !gatedHidesRows && n > 0 && slots.gatedNote}
      {settled && !gated && n === 0 && slots.empty}
      {showRows && slots.beforeList}
      {showRows && (slots.wrapList ? slots.wrapList(list) : list)}
    </>
  )
}
