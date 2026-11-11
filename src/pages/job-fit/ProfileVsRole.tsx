import { FitCard, FitSectionTitle } from "@/components/fit/primitives"
import {
  FIT_V2_SECTION_TITLES,
  NO_GROWTH_AREA_TEXT,
  PROFILE_VS_ROLE_COUNT,
  growthAreaLine,
  type RankedGrowthArea,
} from "@/lib/job-fit/fitReport"

/**
 * JF-6 / D3 — "Your profile versus the role": the top three growth areas from
 * the same ranked list the headline is the first of, each with its coaching
 * line. Fewer than three below the job shows fewer; none says so.
 */
export function ProfileVsRole({ growth }: { growth: RankedGrowthArea[] }) {
  const top = growth.slice(0, PROFILE_VS_ROLE_COUNT)
  return (
    <FitCard className="mb-6">
      <FitSectionTitle>{FIT_V2_SECTION_TITLES[5]}</FitSectionTitle>
      {top.length > 0 ? (
        <ol className="space-y-3">
          {top.map((g, i) => (
            <li key={g.key} className="border-b border-[#f1f3f5] pb-3 last:border-0 last:pb-0">
              <p className="font-medium text-[#1f2937]">
                {i + 1}. {growthAreaLine(g)}
              </p>
              {g.coaching && <p className="mt-1 text-sm text-[#6b7280]">{g.coaching}</p>}
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-[#374151]">{NO_GROWTH_AREA_TEXT}</p>
      )}
    </FitCard>
  )
}
