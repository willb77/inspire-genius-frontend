import { cn } from "@/lib/utils"
import { CONFIDENCE_LABEL } from "@/constants/development"
import type { ConfidenceLevel } from "@/types/development"

const DOT_COLOR: Record<ConfidenceLevel, string> = {
  high: "bg-emerald-500",
  moderate: "bg-amber-500",
  low: "bg-slate-400",
}

export type ConfidenceDotProps = {
  level: ConfidenceLevel
  /** Render the text label alongside the dot. */
  withLabel?: boolean
  className?: string
}

/** Confidence indicator — dot + accessible label (never colour alone). */
export function ConfidenceDot({ level, withLabel = false, className }: ConfidenceDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 rounded-full", DOT_COLOR[level])} aria-hidden="true" />
      <span className={cn(withLabel ? "text-xs text-slate-500" : "sr-only")}>
        {CONFIDENCE_LABEL[level]}
      </span>
    </span>
  )
}
