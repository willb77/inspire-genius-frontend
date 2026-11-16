import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { ArrowLeft, ArrowRight, ClipboardCheck, Loader2, ShieldCheck, UserSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { ROUTES } from "@/constants/routes"
import { useJobDnaDetail } from "@/hooks/job-blueprint/useJobDna"
import { useCandidateDetail, useCandidateInsights, useAdvanceCandidate } from "@/hooks/job-blueprint/useTriage"
import { useScorecardDetail, isNoScorecardError } from "@/hooks/job-blueprint/useScorecard"
import { FitAnalysisView } from "@/components/job-blueprint/triage/FitAnalysisView"
import { InsightPackageView } from "@/components/job-blueprint/triage/InsightPackageView"
import { ScorecardSummary } from "@/components/job-blueprint/scorecard/ScorecardSummary"
import { HireReasonDialog } from "@/components/job-blueprint/triage/HireReasonDialog"
import { advanceNeedsReason } from "@/components/job-blueprint/triage/hireReason"
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
  const { t } = useTranslation("jobBlueprintPages")
  const { candidateId = "" } = useParams<{ candidateId: string }>()
  const candidate = useCandidateDetail(candidateId)
  const jobDna = useJobDnaDetail(candidate.data?.jobId ?? "")
  const insights = useCandidateInsights(candidateId)
  const scorecard = useScorecardDetail(candidateId)
  const advance = useAdvanceCandidate()
  const [hiring, setHiring] = useState(false)
  const [hireError, setHireError] = useState<string | null>(null)

  const benchmark = useMemo(
    () => (jobDna.data ? [...jobDna.data.behaviors, ...jobDna.data.aptitudes, ...jobDna.data.coreTraits] : []),
    [jobDna.data]
  )

  if (candidate.isLoading) return <JobDnaLoading label={t("candidateDetail.loading", { defaultValue: "Loading candidate…" })} />
  if (candidate.isError || !candidate.data)
    return (
      <div className="max-w-2xl">
        <JobDnaError message={apiErrorMessage(candidate.error, t("candidateDetail.loadFailed", { defaultValue: "Failed to load this candidate." }))} onRetry={() => void candidate.refetch()} />
        <Link to={ROUTES.JOB_DNA.CANDIDATES} className="mt-3 inline-block text-sm text-[#7C3AED] underline">
          {t("candidateDetail.back", { defaultValue: "Back to candidates" })}
        </Link>
      </div>
    )

  const c = candidate.data
  const code = c.code ?? c.name
  const terminal = TERMINAL_STEPS.includes(c.status)
  const scored = Boolean(c.prismScores && c.variationScores && c.classificationTier)

  const handleAdvance = async () => {
    // BP-F4: the move to `hired` needs a reason — ask first.
    if (advanceNeedsReason(c.status)) {
      setHireError(null)
      setHiring(true)
      return
    }
    try {
      const next = await advance.mutateAsync(c.id)
      toast.success(t("candidateDetail.advancedTo", { defaultValue: "Candidate {{code}} advanced to {{status}}.", code, status: next?.status ?? t("candidateDetail.nextStage", { defaultValue: "the next stage" }) }))
    } catch (err) {
      toast.error(apiErrorMessage(err, t("candidateDetail.advanceFailed", { defaultValue: "Failed to advance this candidate." })))
    }
  }

  const confirmHire = async (reason: string) => {
    try {
      await advance.mutateAsync({ candidateId: c.id, reason })
      toast.success(t("candidateDetail.markedHired", { defaultValue: "Candidate {{code}} marked hired.", code }))
      setHiring(false)
    } catch (err) {
      setHireError(apiErrorMessage(err, t("candidateDetail.markHiredFailed", { defaultValue: "Failed to mark this candidate hired." })))
    }
  }

  return (
    <div className="max-w-5xl">
      <Link
        to={ROUTES.JOB_DNA.CANDIDATES}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#7C3AED]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("candidateDetail.back", { defaultValue: "Back to candidates" })}
      </Link>

      <JobDnaPageHeader
        icon={UserSearch}
        title={t("candidateDetail.title", { defaultValue: "Candidate {{code}}", code })}
        description={
          jobDna.data
            ? `${jobDna.data.roleTitle} — ${jobDna.data.department}`
            : t("candidateDetail.description", { defaultValue: "Fit, insights and the interview scorecard for one candidate." })
        }
        action={
          <Button type="button" onClick={handleAdvance} disabled={terminal || advance.isPending}>
            {advance.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
                {t("candidateDetail.advancing", { defaultValue: "Advancing…" })}
              </>
            ) : (
              <>
                <ArrowRight className="mr-1.5 h-4 w-4" aria-hidden />
                {terminal ? t("candidateDetail.pipelineComplete", { defaultValue: "Pipeline complete" }) : t("candidateDetail.advance", { defaultValue: "Advance to next stage" })}
              </>
            )}
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <PipelineStepBadge step={c.status} />
        {c.classificationTier ? <ClassificationBadge tier={c.classificationTier} size="sm" /> : null}
        {c.variationScores ? (
          <span className="text-xs text-[#6b7280]">{t("candidateDetail.totalVariation", { defaultValue: "Total variation {{value}}", value: c.variationScores.totalVariation })}</span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-[#9ca3af]">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          {t("candidateDetail.blind", { defaultValue: "Blind screening — identity is held in the blind map and never shown here." })}
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
            {t("candidateDetail.notScored", { defaultValue: "This candidate has not been fit-scored yet — no assessment is on file to compare with the role's benchmark." })}
          </JobDnaEmptyState>
        )}

        {insights.data ? (
          <JobDnaCardSurface>
            <InsightPackageView insight={insights.data} />
          </JobDnaCardSurface>
        ) : insights.isLoading ? (
          <JobDnaLoading label={t("candidateDetail.loadingInsights", { defaultValue: "Loading insights…" })} />
        ) : (
          <JobDnaEmptyState>{t("candidateDetail.noInsights", { defaultValue: "No insight package has been generated for this candidate yet." })}</JobDnaEmptyState>
        )}

        <section aria-labelledby="scorecard-heading">
          <h2 id="scorecard-heading" className="mb-3 flex items-center gap-2 text-base font-semibold text-[#1f2937]">
            <ClipboardCheck className="h-4 w-4 text-[#7C3AED]" aria-hidden />
            {t("candidateDetail.scorecardHeading", { defaultValue: "Interview scorecard" })}
          </h2>
          {scorecard.data ? (
            <ScorecardSummary grandTotal={scorecard.data.grandTotal} recommendation={scorecard.data.recommendation} />
          ) : scorecard.isLoading ? (
            <JobDnaLoading label={t("candidateDetail.loadingScorecard", { defaultValue: "Loading scorecard…" })} />
          ) : scorecard.isError && !isNoScorecardError(scorecard.error) ? (
            <JobDnaError message={t("candidateDetail.scorecardFailed", { defaultValue: "Failed to load the scorecard." })} onRetry={() => void scorecard.refetch()} />
          ) : (
            <JobDnaEmptyState>
              {t("candidateDetail.noScorecard", { defaultValue: "No interview scorecard has been submitted for this candidate yet." })}{" "}
              <Link to={ROUTES.JOB_DNA.SCORECARDS} className="text-[#7C3AED] underline">
                {t("candidateDetail.openScorecards", { defaultValue: "Open scorecards" })}
              </Link>
            </JobDnaEmptyState>
          )}
        </section>
      </div>

      <HireReasonDialog
        open={hiring}
        onOpenChange={setHiring}
        candidateCode={code}
        pending={advance.isPending}
        error={hireError}
        onConfirm={(reason) => void confirmHire(reason)}
      />
    </div>
  )
}
