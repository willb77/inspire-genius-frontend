import { useMemo } from "react"
import { Sprout, MessagesSquare } from "lucide-react"
import type { FitDetail, PerDimensionFit } from "@/types/job-fit"
import type {
  DimensionBenchmark,
  DimensionScore,
  InterpretationBand,
} from "@/types/job-blueprint"
import { BenchmarkRadarChart } from "@/components/job-blueprint/job-dna/BenchmarkRadarChart"
import { ScoreBar } from "@/components/job-blueprint/shared/ScoreBar"
import { FitCard, FitPill, FitSectionTitle } from "./_shared"
import { gapTone, formatGap } from "./_fit"

const NEUTRAL_BAND: InterpretationBand = "moderate"

/** Map the API's per-dimension rows into the radar chart's benchmark/score shapes. */
function toRadarInputs(perDimension: PerDimensionFit[]): {
  behaviors: DimensionBenchmark[]
  aptitudes: DimensionBenchmark[]
  coreTraits: DimensionBenchmark[]
  candidateScores: DimensionScore[]
} {
  const behaviors: DimensionBenchmark[] = []
  const aptitudes: DimensionBenchmark[] = []
  const coreTraits: DimensionBenchmark[] = []
  const candidateScores: DimensionScore[] = []

  for (const d of perDimension) {
    const benchmark: DimensionBenchmark = {
      dimensionId: d.dimensionId,
      dimensionName: d.dimensionName,
      category: d.category,
      rankPosition: 0,
      rankPercent: 0,
      rateValue: 0,
      finalBenchmarkPercent: d.benchmarkScore,
      interpretation: NEUTRAL_BAND,
    }
    if (d.category === "behavior") behaviors.push(benchmark)
    else if (d.category === "aptitude") aptitudes.push(benchmark)
    else coreTraits.push(benchmark)

    candidateScores.push({
      dimensionId: d.dimensionId,
      dimensionName: d.dimensionName,
      category: d.category,
      score: d.candidateScore,
    })
  }

  return { behaviors, aptitudes, coreTraits, candidateScores }
}

/**
 * The deterministic fit breakdown for one `FitDetail`: the profile-vs-benchmark
 * radar, per-dimension gaps with coaching, growth focus, over-use flags and
 * interview self-advocacy. Shared by the role detail page (a published Job DNA)
 * and "Fit a job description" (a drafted target), so both read identically.
 * Nothing here presents a hiring verdict. The narrative cards (summary,
 * follow-up, actions) stay with the role page — they need a published role id.
 */
export function FitBreakdown({ data }: { data: FitDetail }) {
  const radar = useMemo(() => toRadarInputs(data.perDimension), [data])

  return (
    <>
      {/* Radar: your profile vs the role benchmark */}
      <FitCard className="mb-6">
        <FitSectionTitle>Your profile vs. this role</FitSectionTitle>
        <BenchmarkRadarChart
          behaviors={radar.behaviors}
          aptitudes={radar.aptitudes}
          coreTraits={radar.coreTraits}
          candidateScores={radar.candidateScores}
          height={380}
        />
      </FitCard>

      {/* Per-dimension gap table with coaching */}
      <FitCard className="mb-6">
        <FitSectionTitle>Where you stand, dimension by dimension</FitSectionTitle>
        <div className="space-y-4">
          {data.perDimension.map((d) => (
            <div key={`${d.category}-${d.dimensionId}`} className="border-b border-[#f1f3f5] pb-4 last:border-0 last:pb-0">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-medium text-[#1f2937]">{d.dimensionName}</span>
                <FitPill tone={gapTone(d.gap)}>{formatGap(d.gap)}</FitPill>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <ScoreBar score={d.candidateScore} label="You" size="sm" showValue />
                <ScoreBar score={d.benchmarkScore} label="Role benchmark" size="sm" showValue color="bg-[#0D9488]" />
              </div>
              {d.coaching && <p className="mt-2 text-sm text-[#6b7280]">{d.coaching}</p>}
            </div>
          ))}
        </div>
      </FitCard>

      {/* Coaching micro-habits */}
      {data.coachingGaps.length > 0 && (
        <FitCard className="mb-6">
          <FitSectionTitle>Growth focus</FitSectionTitle>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {data.coachingGaps.map((g) => (
              <div key={`${g.category}-${g.dimensionName}`} className="rounded-lg border border-[#e5e7eb] p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Sprout className="h-4 w-4 text-[#0f766e]" />
                  <span className="text-sm font-medium text-[#1f2937]">{g.dimensionName}</span>
                </div>
                <p className="text-xs text-[#6b7280]">
                  Currently {Math.abs(g.gap)} points below this role&apos;s benchmark — a good area
                  to build on.
                </p>
              </div>
            ))}
          </div>
        </FitCard>
      )}

      {/* Over-use flags */}
      {data.overdoneFlags.length > 0 && (
        <FitCard className="mb-6">
          <FitSectionTitle>Watch for over-use</FitSectionTitle>
          <div className="flex flex-wrap gap-2">
            {data.overdoneFlags.map((o) => (
              <FitPill key={o.dimensionName} tone="amber">
                {o.dimensionName} · {o.candidateScore}
              </FitPill>
            ))}
          </div>
          <p className="mt-3 text-sm text-[#6b7280]">
            Strengths you express strongly can crowd out other behaviors this role also values —
            worth balancing.
          </p>
        </FitCard>
      )}

      {/* Interview self-advocacy */}
      {data.interviewSelfAdvocacy.length > 0 && (
        <FitCard className="mb-6">
          <FitSectionTitle>How to speak to your fit in an interview</FitSectionTitle>
          <ul className="space-y-2">
            {data.interviewSelfAdvocacy.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[#374151]">
                <MessagesSquare className="mt-0.5 h-4 w-4 shrink-0 text-[#0D9488]" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </FitCard>
      )}
    </>
  )
}
