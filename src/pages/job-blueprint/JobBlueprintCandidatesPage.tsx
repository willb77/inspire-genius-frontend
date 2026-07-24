import { useMemo, useState } from "react"
import { Users } from "lucide-react"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import { usePipeline, useCandidateInsights } from "@/hooks/job-blueprint/useTriage"
import { CandidateCard } from "@/components/job-blueprint/triage/CandidateCard"
import { FitAnalysisView } from "@/components/job-blueprint/triage/FitAnalysisView"
import { InsightPackageView } from "@/components/job-blueprint/triage/InsightPackageView"
import type { Candidate } from "@/types/job-blueprint"
import {
  JobDnaPageHeader,
  JobDnaCardSurface,
  JobDnaSelect,
  JobDnaEmptyState,
  JobDnaLoading,
  JobDnaError,
} from "./_shared"

/**
 * Candidate roster + per-candidate fit analysis, reading the live triage
 * endpoints (`GET /v1/blueprint/triage/pipeline/:jobId`,
 * `.../candidate/:id/insights`). The fit / matching path is gated server-side,
 * so an entitled-but-ungated user sees an empty roster with a clear message
 * rather than an error.
 */
export default function JobBlueprintCandidatesPage() {
  const { data: jobDnas, isLoading: loadingJobs } = useJobDnaList()
  const [jobId, setJobId] = useState("")
  const [selected, setSelected] = useState<Candidate | null>(null)

  const { data: candidates, isLoading, isError, refetch } = usePipeline(jobId)
  const { data: insights } = useCandidateInsights(selected?.id ?? "")

  const selectedJobDna = useMemo(
    () => jobDnas?.find((jd) => jd.id === jobId),
    [jobDnas, jobId]
  )
  const benchmark = useMemo(
    () =>
      selectedJobDna
        ? [...selectedJobDna.behaviors, ...selectedJobDna.aptitudes, ...selectedJobDna.coreTraits]
        : [],
    [selectedJobDna]
  )

  return (
    <div className="max-w-6xl">
      <JobDnaPageHeader
        icon={Users}
        title="Candidates"
        description="Screen and review candidates scored against a role's Job DNA benchmark."
        action={
          <JobDnaSelect
            jobDnas={jobDnas ?? []}
            value={jobId}
            onChange={(id) => {
              setJobId(id)
              setSelected(null)
            }}
          />
        }
      />

      {loadingJobs ? (
        <JobDnaLoading label="Loading roles…" />
      ) : !jobId ? (
        <JobDnaEmptyState>Select a role to see its candidate roster.</JobDnaEmptyState>
      ) : isLoading ? (
        <JobDnaLoading label="Loading candidates…" />
      ) : isError ? (
        <JobDnaError message="Failed to load candidates." onRetry={() => void refetch()} />
      ) : !candidates || candidates.length === 0 ? (
        <JobDnaEmptyState>
          No candidates in this pipeline yet. Candidate screening (the fit / matching path) is
          gated for this account.
        </JobDnaEmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="space-y-2">
            {candidates.map((c) => (
              <CandidateCard key={c.id} candidate={c} onClick={() => setSelected(c)} />
            ))}
          </div>

          <div>
            {selected && selected.prismScores && selected.variationScores && selected.classificationTier ? (
              <div className="space-y-6">
                <JobDnaCardSurface>
                  <FitAnalysisView
                    candidateName={selected.name}
                    candidateScores={selected.prismScores}
                    benchmark={benchmark}
                    variation={selected.variationScores}
                    tier={selected.classificationTier}
                  />
                </JobDnaCardSurface>
                {insights ? (
                  <JobDnaCardSurface>
                    <InsightPackageView insight={insights} />
                  </JobDnaCardSurface>
                ) : null}
              </div>
            ) : (
              <JobDnaEmptyState>
                {selected
                  ? "This candidate has not been fit-scored yet."
                  : "Select a candidate to view their fit analysis."}
              </JobDnaEmptyState>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
