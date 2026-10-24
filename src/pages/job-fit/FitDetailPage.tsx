import { Link, useParams, useSearchParams } from "react-router-dom"
import { ArrowLeft, Target } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitDetail } from "@/hooks/job-fit/useFitDetail"
import {
  FitPageHeader,
  FitPill,
  FitEmptyState,
  FitLoading,
  FitError,
  PartialProfileNote,
} from "@/components/fit/primitives"
import { jobFitNarrativeEnabled, displayFitPercent, parseFitMethod } from "@/components/fit/fit"
import { FitStatTiles } from "@/components/fit/FitResult"
import { FitComponentsCard } from "./FitComponentsCard"
import { useJobFitComponentsEnabled } from "@/hooks/switches/useJobFitComponentsEnabled"
import { useFitComponents } from "@/hooks/job-fit/useFitComponents"
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled"
import { useFitSharedDisplayEnabled } from "@/hooks/switches/useFitSharedDisplayEnabled"
import { useResumeWriterTailoredEnabled } from "@/hooks/switches/useResumeWriterTailoredEnabled"
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
  // FIT-1: open under the read the list row used (`?method=`), so the row and
  // this page show the same %. No/unknown param = the backend default (gap).
  const [searchParams] = useSearchParams()
  const method = parseFitMethod(searchParams.get("method"))
  const { data, isLoading, isError } = useFitDetail(jobId, method)
  const narrative = jobFitNarrativeEnabled()
  // Feeds Phase 2 — the components beside the fit. Idle (no request, no card)
  // unless the server switch is on, so the page is today's page by default.
  const componentsOn = useJobFitComponentsEnabled()
  const fitPct = data ? displayFitPercent(data) : 0
  const components = useFitComponents(
    data && jobId ? [{ jobId, fitScore: fitPct }] : [],
    componentsOn,
  )
  // Feeds Phase 3 — "Make this my target". Same rule: nothing renders and no
  // request is made unless the server's goal_targets switch is on.
  const targetsOn = useGoalTargetsEnabled()
  // FIT-5b — the shared fit display's wording (decision 3). Off, loading or
  // unreadable = FIT-5a's page exactly.
  const sharedDisplay = useFitSharedDisplayEnabled()
  // RW2 — "Write Résumé" opens the tailored Résumé Writer for this role, only
  // while the server's resume_writer_tailored switch is on. Off, loading or
  // unreadable = today's inline draft.
  const tailoredResume = useResumeWriterTailoredEnabled()
  const tailoredResumeHref =
    tailoredResume && jobId ? `${ROUTES.MY_RESUME}?jobId=${encodeURIComponent(jobId)}` : undefined

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
          {narrative && <FitActionsBar data={data} tailoredResumeHref={tailoredResumeHref} />}

          {/* Closeness summary */}
          <FitStatTiles data={data} subject="role" className="mb-6" shared={sharedDisplay} />

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
              person={components.data?.person}
              benchmarksValidated={components.data?.benchmarksValidated}
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
