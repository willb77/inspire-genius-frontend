import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { fitPercentTone } from "./fit"
import { CAREER_PCT_COLOR, DS_TONE_TEXT } from "./palette"

/**
 * How a fit figure is drawn:
 * - `row` — a Career Fit list row (teal palette).
 * - `row-ds` — a Direction Setting list row (neutral palette).
 * - `headline` — a large headline figure (Career Fit detail, Fit a JD, history).
 * - `headline-ds` — Direction Setting's breakdown headline.
 */
export type FitScoreFigureVariant = "row" | "row-ds" | "headline" | "headline-ds"

/**
 * The one place a fit percentage is DRAWN (FIT-5). The number itself always
 * comes from `displayFitPercent`; this component only decides how it looks,
 * which is the seam FIT-4b changes. Each variant reproduces, byte for byte,
 * the markup its surface drew by hand before FIT-5a.
 */
export function FitScoreFigure({
  value,
  variant,
  className,
  children,
}: {
  value: number
  variant: FitScoreFigureVariant
  /** `headline` only: classes placed before the figure's own. */
  className?: string
  /** `headline` only: rendered after the % sign, inside the figure. */
  children?: ReactNode
}) {
  switch (variant) {
    case "row":
      return (
        <div
          className={`text-2xl font-bold leading-none ${CAREER_PCT_COLOR[fitPercentTone(value)] ?? CAREER_PCT_COLOR.teal}`}
        >
          {value}
          <span className="text-sm font-semibold text-[#9ca3af]">%</span>
        </div>
      )
    case "row-ds":
      return (
        <span
          className={cn("block text-2xl font-semibold leading-none", DS_TONE_TEXT[fitPercentTone(value)])}
        >
          {value}
          <span className="text-sm text-muted-foreground">%</span>
        </span>
      )
    case "headline-ds":
      return (
        <span
          className={cn("text-4xl font-semibold leading-none", DS_TONE_TEXT[fitPercentTone(value)])}
        >
          {value}
          <span className="text-xl text-muted-foreground">%</span>
        </span>
      )
    case "headline":
      return (
        <div className={cn(className, "flex items-baseline gap-1")}>
          <span className="text-4xl font-bold text-[#1f2937]">{value}</span>
          <span className="text-lg font-semibold text-[#6b7280]">%</span>
          {children}
        </div>
      )
  }
}
