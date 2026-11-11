import { Sprout } from "lucide-react"
import { FitCard, FitSectionTitle } from "@/components/fit/primitives"
import {
  FIT_V2_SECTION_TITLES,
  NO_GROWTH_AREA_TEXT,
  growthAreaLine,
  type RankedGrowthArea,
} from "@/lib/job-fit/fitReport"

/**
 * JF-6 / D3 — the one growth area at the top of the job page: the first of the
 * same ranked list "Your profile versus the role" explains three of. With none
 * below the job, it says so rather than drawing an empty card.
 */
export function HeadlineGrowthArea({ growth }: { growth: RankedGrowthArea[] }) {
  const top = growth[0]
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>{FIT_V2_SECTION_TITLES[1]}</FitSectionTitle>
      {top ? (
        <div className="flex items-start gap-2">
          <Sprout className="mt-0.5 h-5 w-5 shrink-0 text-[#0f766e]" aria-hidden />
          <div>
            <p className="text-base font-semibold text-[#1f2937]">{top.dimensionName}</p>
            <p className="text-sm text-[#374151]">{growthAreaLine(top)}</p>
            <p className="text-xs text-[#6b7280]">{top.groupLabel}</p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[#374151]">{NO_GROWTH_AREA_TEXT}</p>
      )}
    </FitCard>
  )
}
