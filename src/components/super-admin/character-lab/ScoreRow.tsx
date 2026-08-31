import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RubricBand, RubricDimension, ScoreByType, ScoreType } from "@/types/character-lab"

/**
 * One scored scale.
 *
 * The definition is one click away on every row, not buried in a separate
 * legend. A reader who does not know what "Evaluating" measures will otherwise
 * guess from the word — which is precisely the failure this surface exists to
 * demonstrate.
 */
export default function ScoreRow({
  dimension,
  scores,
  scoreType,
  bands,
  evidence,
}: {
  dimension: RubricDimension
  scores: ScoreByType
  scoreType: ScoreType
  bands: RubricBand[]
  evidence?: string
}) {
  const [open, setOpen] = useState(false)
  const value = scores[scoreType] ?? scores.Underlying
  const underlying = scores.Underlying
  const adapted = scores.Adapted
  const gap = adapted !== undefined && underlying !== undefined ? adapted - underlying : undefined
  const notableGap = gap !== undefined && Math.abs(gap) >= 12

  if (value === undefined) return null

  // SD Score and Skew are not 0-100 traits; scaling their bar to 100 would
  // draw an SD of 7 (which is high-ish) as a near-empty bar.
  const ceiling = dimension.is_trait ? 100 : 20
  const pct = Math.min(100, (value / ceiling) * 100)
  const band = dimension.is_trait
    ? bands.find((b) => value >= b.min && value <= b.max)
    : undefined

  return (
    <div className="rounded-md border border-border/60 bg-card/40">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40"
      >
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <span className="w-44 shrink-0 truncate text-sm font-medium">{dimension.label}</span>
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <span
            className="block h-2 rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="w-10 shrink-0 text-right text-sm tabular-nums">{value}</span>
        <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
          {band?.label ?? (dimension.is_trait ? "" : "indicator")}
        </span>
        {notableGap && (
          <span
            className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
            title={`Adapted ${adapted} vs Underlying ${underlying} — presented behaviour differs from instinct`}
          >
            gap {gap! > 0 ? "+" : ""}
            {gap}
          </span>
        )}
      </button>

      {open && (
        <div className="space-y-2 border-t border-border/60 px-3 py-3 pl-9 text-sm">
          <p className="text-muted-foreground">{dimension.measures}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <p className="rounded bg-muted/50 p-2 text-xs">
              <span className="font-semibold">High: </span>
              {dimension.high}
            </p>
            <p className="rounded bg-muted/50 p-2 text-xs">
              <span className="font-semibold">Low: </span>
              {dimension.low}
            </p>
          </div>
          {band && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">{value} is {band.label.toLowerCase()}</span> — {band.meaning}
            </p>
          )}
          {evidence && (
            <p className="text-xs">
              <span className="font-semibold">Why this score: </span>
              {evidence}
            </p>
          )}
          {notableGap && (
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Shows {adapted} but is {underlying}. A gap this size means effortful self-presentation
              on this scale — the place strain tends to appear.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
