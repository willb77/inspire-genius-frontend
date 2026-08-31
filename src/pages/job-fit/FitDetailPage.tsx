import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Target, Sprout, AlertTriangle, MessagesSquare } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import type { PerDimensionFit } from "@/types/job-fit"
import type {
  DimensionBenchmark,
  DimensionScore,
  InterpretationBand,
} from "@/types/job-blueprint"
import { BenchmarkRadarChart } from "@/components/job-blueprint/job-dna/BenchmarkRadarChart"
import { ScoreBar } from "@/components/job-blueprint/shared/ScoreBar"
import {
  FitPageHeader,
  FitCard,
  FitStat,
  FitPill,
  FitSectionTitle,
  FitEmptyState,
  FitLoading,
  FitError,
} from "./_shared"
import { tierLabel, gapTone, formatGap, jobFitNarrativeEnabled } from "./_fit"
import { FitSummaryCard } from "./FitSummaryCard"
import { FitFollowUpCard } from "./FitFollowUpCard"
import { FitActionsBar } from "./FitActionsBar"

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
 * Full fit breakdown for one role: closeness summary, a your-profile-vs-benchmark
 * radar, per-dimension gaps with coaching micro-habits, over-use flags, and
 * plain-language interview self-advocacy. Nothing here presents a hiring verdict.
 */
export default function FitDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { data, isLoading, isError } = useFitDetail(jobId)

  const radar = useMemo(
    () => (data ? toRadarInputs(data.perDimension) : null),
    [data]
  )
  const narrative = jobFitNarrativeEnabled()

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        to={ROUTES.JOB_FIT.MATCHES}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#0D9488]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to matches
      </Link>

      {isLoading && <FitLoading label="Loading your fit for this role…" />}

      {isError && (
        <FitError>We couldn&apos;t load this role&apos;s breakdown. Please try again shortly.</FitError>
      )}

      {!isLoading && !isError && data && radar && (
        <>
          <FitPageHeader
            icon={Target}
            title={data.roleTitle}
            description="How your behavioral profile compares with this role, dimension by dimension."
          />

          {/* Action toolbar: Download PDF · Export As · Print · Save · Email · Copy link · Write Résumé */}
          {narrative && <FitActionsBar data={data} />}

          {/* Closeness summary */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FitStat
              icon={Target}
              label="Overall closeness"
              value={data.totalVariation}
              hint="Lower means closer to this role's benchmark"
            />
            <FitStat
              icon={Sprout}
              label="Growth areas"
              value={data.coachingGaps.length}
              hint="Dimensions to develop toward the benchmark"
              tone="amber"
            />
            <FitStat
              icon={AlertTriangle}
              label="Priority focus"
              value={data.criticalGaps.length}
              hint="Larger gaps worth prioritizing"
              tone={data.criticalGaps.length > 0 ? "red" : "green"}
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
            <FitPill tone="teal">{tierLabel(data.tier)} role</FitPill>
            {data.baseTier !== data.tier && (
              <FitPill tone="gray">Base tier: {tierLabel(data.baseTier)}</FitPill>
            )}
          </div>

          {/* Fit narrative: plain-language read of the overlay + fit % + gaps */}
          {narrative && <FitSummaryCard data={data} />}

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

          {/* Inline follow-up — answers render right here, not in a separate chat */}
          {narrative && <FitFollowUpCard data={data} />}
        </>
      )}

      {!isLoading && !isError && !data && (
        <FitEmptyState>This role&apos;s fit breakdown isn&apos;t available.</FitEmptyState>
      )}
    </div>
  )
}
