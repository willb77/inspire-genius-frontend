/**
 * The Bio Capture chapters strip — the compact overview that sits ABOVE the
 * Chronicle interview tile.
 *
 * Two pieces, both deliberately thin so the interview tile below gets the room:
 *   1. a single-line "Suggested next" bar — just the label and a Continue link,
 *   2. the six life chapters as a tight 2×3 grid of small tiles (status + a
 *      one-line distilled summary), each tappable to steer the interview into
 *      that chapter.
 *
 * The detailed episode timeline that used to live here now renders inside the
 * interview tile's insight rail — this strip is orientation, not detail.
 */
import { useMemo } from "react"
import { ArrowRight, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  BIO_MODULE_TYPES,
  type BioModule,
  type MemberNarrative,
} from "@/types/bio"
import { moduleLabel } from "@/lib/bio/clientMemoir"

function statusDot(status: string): string {
  const s = status.toLowerCase()
  if (s === "complete" || s === "completed" || s === "covered")
    return "bg-emerald-500"
  if (s === "in_progress" || s === "started" || s === "active")
    return "bg-amber-500"
  return "bg-slate-300"
}

function statusLabel(status: string): string {
  const s = status.toLowerCase()
  if (s === "complete" || s === "completed" || s === "covered") return "Captured"
  if (s === "in_progress" || s === "started" || s === "active")
    return "In progress"
  return "Not started"
}

export type BioChaptersStripProps = {
  narrative: MemberNarrative
  /** Steer the interview into a chapter (wired to the Chronicle tile). */
  onStartSuggested?: (moduleType: string) => void
}

export function BioChaptersStrip({
  narrative,
  onStartSuggested,
}: BioChaptersStripProps) {
  // Modules in canonical order, synthesising placeholders so all six always show.
  const modules = useMemo<BioModule[]>(() => {
    const byType = new Map(narrative.modules.map((m) => [m.moduleType, m]))
    return BIO_MODULE_TYPES.map(
      (moduleType) =>
        byType.get(moduleType) ?? {
          moduleType,
          status: "not_started",
          distilledLine: "",
          startedAt: null,
          completedAt: null,
        },
    )
  }, [narrative.modules])

  const next = narrative.nextSuggestedModule

  return (
    <div className="space-y-3">
      {/* Thin "suggested next" bar — label + Continue link only. */}
      {next && (
        <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
          <span className="truncate">
            Suggested next:{" "}
            <span className="font-semibold">{moduleLabel(next)}</span>
          </span>
          {onStartSuggested && (
            <button
              type="button"
              onClick={() => onStartSuggested(next)}
              className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-primary hover:underline"
            >
              Continue
              <ArrowRight className="h-3 w-3" aria-hidden />
            </button>
          )}
        </div>
      )}

      {/* Compact 2×3 chapters grid. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {modules.map((m) => {
          const isNext = m.moduleType === next
          const line = m.distilledLine?.trim()
          return (
            <button
              key={m.moduleType}
              type="button"
              onClick={() => onStartSuggested?.(m.moduleType)}
              title={line || `Start the ${moduleLabel(m.moduleType)} chapter`}
              className={cn(
                "flex flex-col gap-1 rounded-md border bg-card p-2 text-left transition hover:border-primary/40 hover:shadow-sm",
                isNext && "ring-1 ring-primary",
              )}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={cn("h-1.5 w-1.5 shrink-0 rounded-full", statusDot(m.status))}
                  aria-hidden
                />
                <span className="truncate text-xs font-medium">
                  {moduleLabel(m.moduleType)}
                </span>
              </div>
              <p className="line-clamp-2 min-h-[2rem] text-[11px] leading-tight text-muted-foreground">
                {line || statusLabel(m.status)}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default BioChaptersStrip
