import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Target, Sprout, AlertTriangle } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import {
  FitPageHeader,
  FitStat,
  FitPill,
  FitEmptyState,
  FitLoading,
  FitError,
} from "./_shared"
import { tierLabel, jobFitNarrativeEnabled } from "./_fit"
import { FitBreakdown } from "./FitBreakdown"
import { FitSummaryCard } from "./FitSummaryCard"
import { FitFollowUpCard } from "./FitFollowUpCard"
import { FitActionsBar } from "./FitActionsBar"

/**
 * Full fit breakdown for one role: closeness summary, a your-profile-vs-benchmark
 * radar, per-dimension gaps with coaching micro-habits, over-use flags, and
 * plain-language interview self-advocacy. Nothing here presents a hiring verdict.
 */
export default function FitDetailPage() {
  const { jobId } = useParams<{ jobId: string }>()
  const { data, isLoading, isError } = useFitDetail(jobId)
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

      {!isLoading && !isError && data && (
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

          {/* Radar, per-dimension gaps, growth focus, over-use, self-advocacy — shared with Fit a JD */}
          <FitBreakdown data={data} />

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
