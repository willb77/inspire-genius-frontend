import { useParams } from "react-router-dom"
import { Scale } from "lucide-react"
import { useDecisionPathStatus, useDecisionRecord } from "@/hooks/job-blueprint/useDecisionPath"
import { DecisionRecord, Recommendation } from "@/components/job-blueprint/decision-path/DecisionRecord"
import { DecisionForm } from "@/components/job-blueprint/decision-path/DecisionForms"
import { JobDnaCardSurface, JobDnaEmptyState, JobDnaError, JobDnaLoading, JobDnaPageHeader } from "../_shared"

/**
 * One case: the whole decision audit record on one screen, with the decision
 * form beneath it for a named decision-maker. The server decides who may see
 * the record (staff and named decision-makers) and who sees only the
 * recommendation (other managers in the organisation); this page renders what
 * it is given. A refused decision comes back in the server's own words.
 */
export default function DecisionPathCasePage() {
  const { caseId = "" } = useParams()
  const status = useDecisionPathStatus()
  const record = useDecisionRecord(caseId, status !== null)

  if (!status) {
    return (
      <div className="max-w-4xl">
        <JobDnaEmptyState>The decision path is not enabled for your organisation.</JobDnaEmptyState>
      </div>
    )
  }
  if (record.isLoading) return <JobDnaLoading label="Loading the record…" />
  if (record.isError || !record.data) {
    return <JobDnaError message="This case could not be loaded." onRetry={() => void record.refetch()} />
  }
  const view = record.data
  const canDecide = view.access === "record" && !status.superAdmin
  return (
    <div className="max-w-5xl space-y-4">
      <JobDnaPageHeader icon={Scale} title="Decision record" description={view.advisoryNote} />
      {view.access === "summary" ? (
        <Recommendation view={view} />
      ) : (
        <DecisionRecord view={view} />
      )}
      {canDecide && view.status === "open" ? (
        <JobDnaCardSurface>
          <DecisionForm caseId={view.id} recommended={view.summary.recommendedRoute} status={status} />
        </JobDnaCardSurface>
      ) : null}
      {canDecide && view.status === "decided" ? (
        <JobDnaCardSurface>
          <DecisionForm
            caseId={view.id}
            recommended={view.summary.recommendedRoute}
            current={view.summary.finalRoute}
            status={status}
            amend
          />
        </JobDnaCardSurface>
      ) : null}
    </div>
  )
}
