import { useState } from "react"
import { toast } from "sonner"
import { GitBranch } from "lucide-react"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import { usePipeline, useAdvanceCandidate } from "@/hooks/job-blueprint/useTriage"
import { PipelineDashboard } from "@/components/job-blueprint/triage/PipelineDashboard"
import {
  JobDnaPageHeader,
  JobDnaSelect,
  JobDnaEmptyState,
  JobDnaLoading,
  JobDnaError,
} from "./_shared"

/**
 * Hiring pipeline board for a selected role, reading the live triage pipeline
 * (`GET /v1/blueprint/triage/pipeline/:jobId`). Advancing a candidate posts to
 * `POST /v1/blueprint/triage/advance/:id` (useAdvanceCandidate).
 */
export default function JobBlueprintPipelinePage() {
  const { data: jobDnas, isLoading: loadingJobs } = useJobDnaList()
  const [jobId, setJobId] = useState("")

  const { data: candidates, isLoading, isError, refetch } = usePipeline(jobId)
  const advance = useAdvanceCandidate()

  const handleAdvance = async (candidateId: string) => {
    try {
      await advance.mutateAsync(candidateId)
      toast.success("Candidate advanced.")
    } catch {
      toast.error("Failed to advance candidate.")
    }
  }

  return (
    <div className="max-w-6xl">
      <JobDnaPageHeader
        icon={GitBranch}
        title="Pipeline"
        description="Track candidates through each stage of the hiring pipeline for a role."
        action={
          <JobDnaSelect jobDnas={jobDnas ?? []} value={jobId} onChange={setJobId} />
        }
      />

      {loadingJobs ? (
        <JobDnaLoading label="Loading roles…" />
      ) : !jobId ? (
        <JobDnaEmptyState>Select a role to see its pipeline.</JobDnaEmptyState>
      ) : isLoading ? (
        <JobDnaLoading label="Loading pipeline…" />
      ) : isError ? (
        <JobDnaError message="Failed to load the pipeline." onRetry={() => void refetch()} />
      ) : !candidates || candidates.length === 0 ? (
        <JobDnaEmptyState>
          No candidates in this pipeline yet. Candidate intake and matching are gated for this
          account.
        </JobDnaEmptyState>
      ) : (
        <PipelineDashboard
          candidates={candidates}
          onCandidateClick={(c) => toast.info(`${c.name} — ${c.status}`)}
          onAdvance={handleAdvance}
        />
      )}
    </div>
  )
}
