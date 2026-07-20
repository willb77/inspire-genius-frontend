import { Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { FrameworkCoverage } from "@/types/development"

type FrameworkKey = "prism" | "clifton" | "disc"

const FRAMEWORKS: { key: FrameworkKey; label: string; dateKey: keyof FrameworkCoverage }[] = [
  { key: "prism", label: "PRISM", dateKey: "prismAssessedAt" },
  { key: "clifton", label: "Clifton", dateKey: "cliftonAssessedAt" },
  { key: "disc", label: "DISC", dateKey: "discAssessedAt" },
]

function formatDate(value?: string): string | undefined {
  if (!value) return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

export type CoverageChipsProps = {
  coverage: FrameworkCoverage
  /** When set, missing frameworks render as an "Invite" action. */
  onInvite?: (framework: FrameworkKey) => void
  /** Show assessment dates under complete frameworks (workspace header). */
  showDates?: boolean
  className?: string
  size?: "sm" | "md"
}

/**
 * PRISM / Clifton / DISC coverage chips — filled (complete) vs outline
 * (missing → Invite). Coverage is conveyed with an icon + label, never colour
 * alone, for accessibility.
 */
export function CoverageChips({
  coverage,
  onInvite,
  showDates = false,
  className,
  size = "md",
}: CoverageChipsProps) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)} aria-label="Assessment coverage">
      {FRAMEWORKS.map(({ key, label, dateKey }) => {
        const complete = coverage[key]
        const date = showDates ? formatDate(coverage[dateKey] as string | undefined) : undefined
        const chipBase = cn(
          "inline-flex items-center gap-1 rounded-full border font-medium",
          size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        )
        return (
          <li key={key} className="flex flex-col gap-0.5">
            {complete ? (
              <span
                className={cn(chipBase, "border-emerald-200 bg-emerald-50 text-emerald-700")}
                data-testid={`coverage-${key}-complete`}
              >
                <Check className="h-3 w-3" aria-hidden="true" />
                {label}
                <span className="sr-only"> assessment complete</span>
              </span>
            ) : onInvite ? (
              <button
                type="button"
                onClick={() => onInvite(key)}
                className={cn(
                  chipBase,
                  "border-dashed border-slate-300 bg-transparent text-slate-500 hover:border-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3B5BFF]",
                )}
                data-testid={`coverage-${key}-invite`}
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                {label}
                <span className="sr-only"> — invite to complete</span>
              </button>
            ) : (
              <span
                className={cn(chipBase, "border-dashed border-slate-300 bg-transparent text-slate-400")}
                data-testid={`coverage-${key}-missing`}
              >
                <Plus className="h-3 w-3" aria-hidden="true" />
                {label}
                <span className="sr-only"> — not assessed</span>
              </span>
            )}
            {date ? <span className="pl-1 text-[10px] text-slate-400">{date}</span> : null}
          </li>
        )
      })}
    </ul>
  )
}
