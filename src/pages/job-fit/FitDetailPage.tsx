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
  PartialProfileNote,
} from "./_shared"
import { jobFitNarrativeEnabled, fitPercent } from "./_fit"
import { FitComponentsCard } from "./FitComponentsCard"
import { useJobFitComponentsEnabled } from "@/hooks/switches/useJobFitComponentsEnabled"
import { useFitComponents } from "@/hooks/job-fit/useFitComponents"
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled"
import { MakeTargetCard } from "./MakeTargetCard"
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
  // Feeds Phase 2 — the components beside the fit. Idle (no request, no card)
  // unless the server switch is on, so the page is today's page by default.
  const componentsOn = useJobFitComponentsEnabled()
  const fitPct = data ? fitPercent(data.fitScore, data.totalVariation, data.perDimension.length || 22) : 0
  const components = useFitComponents(
    data && jobId ? [{ jobId, fitScore: fitPct }] : [],
    componentsOn,
  )
  // Feeds Phase 3 — "Make this my target". Same rule: nothing renders and no
  // request is made unless the server's goal_targets switch is on.
  const targetsOn = useGoalTargetsEnabled()

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

          {/* BP-F5: a partial-profile score says what it rests on. */}
          <PartialProfileNote coverage={data} />

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

          {/* No fit tier or base tier here (4.1, option D): the four-tier label
              rests on an uncalibrated cut, so the person sees the score only. */}
          {typeof data.blueprintVersion === "number" && (
            <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#6b7280]">
              <FitPill tone="gray">Scored against benchmark v{data.blueprintVersion}</FitPill>
            </div>
          )}

          {componentsOn && (
            <FitComponentsCard
              fitPct={fitPct}
              job={jobId ? components.data?.jobs[jobId] : undefined}
              weights={components.data?.weights}
              isError={components.isError}
            />
          )}

          {targetsOn && <MakeTargetCard data={data} />}

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
