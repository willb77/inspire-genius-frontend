import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { ArrowLeft, ArrowRight, ClipboardCheck, Loader2, ShieldCheck, UserSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ROUTES } from "@/constants/routes"
import { useJobDnaDetail } from "@/hooks/job-blueprint/useJobDna"
import { useCandidateDetail, useCandidateInsights, useAdvanceCandidate } from "@/hooks/job-blueprint/useTriage"
import { useScorecardDetail, isNoScorecardError } from "@/hooks/job-blueprint/useScorecard"
import { FitAnalysisView } from "@/components/job-blueprint/triage/FitAnalysisView"
import { InsightPackageView } from "@/components/job-blueprint/triage/InsightPackageView"
import { ScorecardSummary } from "@/components/job-blueprint/scorecard/ScorecardSummary"
import { ClassificationBadge } from "@/components/job-blueprint/shared/ClassificationBadge"
import { PipelineStepBadge } from "@/components/job-blueprint/shared/PipelineStepBadge"
import type { PipelineStep } from "@/types/job-blueprint"
import { JobDnaPageHeader, JobDnaCardSurface, JobDnaEmptyState, JobDnaLoading, JobDnaError } from "./_shared"

/** Terminal pipeline steps — nothing to advance to. */
const TERMINAL_STEPS: PipelineStep[] = ["hired", "rejected"]

/**
 * One candidate, by id: `/vertical/job-blueprint/candidates/:candidateId`.
 *
 * Reads the live triage record (`GET /v1/blueprint/triage/candidate/:id`), the
 * role's Job DNA for the benchmark, the insight package and the submitted
 * scorecard, and advances the candidate through the pipeline with the same
 * mutation the pipeline board uses.
 *
 * Blind by construction: the triage service never sends a name or an email —
 * `name` IS the blind code, identity lives only in the secured blind map and
 * there is no unlock surface here. The page says so rather than showing a
 * field that would always be empty.
 */
export default function JobBlueprintCandidateDetailPage() {
  const { candidateId = "" } = useParams<{ candidateId: string }>()
  const candidate = useCandidateDetail(candidateId)
  const jobDna = useJobDnaDetail(candidate.data?.jobId ?? "")
  const insights = useCandidateInsights(candidateId)
  const scorecard = useScorecardDetail(candidateId)
  const advance = useAdvanceCandidate()

  const benchmark = useMemo(
    () => (jobDna.data ? [...jobDna.data.behaviors, ...jobDna.data.aptitudes, ...jobDna.data.coreTraits] : []),
    [jobDna.data]
  )

  if (candidate.isLoading) return <JobDnaLoading label="Loading candidate…" />
  if (candidate.isError || !candidate.data)
    return (
      <div className="max-w-2xl">
        <JobDnaError message="Failed to load this candidate." onRetry={() => void candidate.refetch()} />
        <Link to={ROUTES.JOB_DNA.CANDIDATES} className="mt-3 inline-block text-sm text-[#7C3AED] underline">
          Back to candidates
        </Link>
      </div>
    )

  const c = candidate.data
  const code = c.code ?? c.name
  const terminal = TERMINAL_STEPS.includes(c.status)
  const scored = Boolean(c.prismScores && c.variationScores && c.classificationTier)

  const handleAdvance = async () => {
    try {
      const next = await advance.mutateAsync(c.id)
      toast.success(`Candidate ${code} advanced to ${next?.status ?? "the next stage"}.`)
    } catch {
      toast.error("Failed to advance this candidate.")
    }
  }

  return (
    <div className="max-w-5xl">
      <Link
        to={ROUTES.JOB_DNA.CANDIDATES}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#7C3AED]"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to candidates
      </Link>

      <JobDnaPageHeader
        icon={UserSearch}
        title={`Candidate ${code}`}
        description={
          jobDna.data
            ? `${jobDna.data.roleTitle} — ${jobDna.data.department}`
            : "Fit, insights and the interview scorecard for one candidate."
        }
        action={
          <Button type="button" onClick={handleAdvance} disabled={terminal || advance.isPending}>
            {advance.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                Advancing…
              </>
            ) : (
              <>
                <ArrowRight className="mr-1.5 h-4 w-4" aria-hidden />
                {terminal ? "Pipeline complete" : "Advance to next stage"}
              </>
            )}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <PipelineStepBadge step={c.status} />
        {c.classificationTier ? <ClassificationBadge tier={c.classificationTier} size="sm" /> : null}
        {c.variationScores ? (
          <span className="text-xs text-[#6b7280]">Total variation {c.variationScores.totalVariation}</span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-[#9ca3af]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Blind screening — identity is held in the blind map and never shown here.
        </span>
      </div>

      <div className="space-y-6">
        {scored && c.prismScores && c.variationScores && c.classificationTier ? (
          <JobDnaCardSurface>
            <FitAnalysisView
              candidateName={code}
              candidateScores={c.prismScores}
              benchmark={benchmark}
              variation={c.variationScores}
              tier={c.classificationTier}
            />
          </JobDnaCardSurface>
        ) : (
          <JobDnaEmptyState>
            This candidate has not been fit-scored yet — no assessment is on file to compare with the
            role&apos;s benchmark.
          </JobDnaEmptyState>
        )}

        {insights.data ? (
          <JobDnaCardSurface>
            <InsightPackageView insight={insights.data} />
          </JobDnaCardSurface>
        ) : insights.isLoading ? (
          <JobDnaLoading label="Loading insights…" />
        ) : (
          <JobDnaEmptyState>No insight package has been generated for this candidate yet.</JobDnaEmptyState>
        )}

        <section aria-labelledby="scorecard-heading">
          <h2 id="scorecard-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-[#1f2937]">
            <ClipboardCheck className="h-4 w-4 text-[#7C3AED]" aria-hidden />
            Interview scorecard
          </h2>
          {scorecard.data ? (
            <ScorecardSummary grandTotal={scorecard.data.grandTotal} recommendation={scorecard.data.recommendation} />
          ) : scorecard.isLoading ? (
            <JobDnaLoading label="Loading scorecard…" />
          ) : scorecard.isError && !isNoScorecardError(scorecard.error) ? (
            <JobDnaError message="Failed to load the scorecard." onRetry={() => void scorecard.refetch()} />
          ) : (
            <JobDnaEmptyState>
              No interview scorecard has been submitted for this candidate yet.{" "}
              <Link to={ROUTES.JOB_DNA.SCORECARDS} className="text-[#7C3AED] underline">
                Open scorecards
              </Link>
            </JobDnaEmptyState>
          )}
        </section>
      </div>
    </div>
  )
}
