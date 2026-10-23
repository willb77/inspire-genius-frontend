import { Link, useNavigate } from "react-router-dom"
import { Scale, ListChecks } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import {
  useDecisionCases,
  useDecisionPathStatus,
  useDecisionRuleSets,
} from "@/hooks/job-blueprint/useDecisionPath"
import { IntakeForm } from "@/components/job-blueprint/decision-path/DecisionForms"
import { ROUTE_LABEL } from "@/components/job-blueprint/decision-path/labels"
import {
  JobDnaCardSurface,
  JobDnaEmptyState,
  JobDnaLinkButton,
  JobDnaLoading,
  JobDnaPageHeader,
} from "../_shared"

/**
 * Decision path — the organisation's cases and the intake form. Renders only
 * "not enabled" unless the server says the switch applies to the caller.
 */
export default function DecisionPathPage() {
  const status = useDecisionPathStatus()
  const enabled = status !== null
  const navigate = useNavigate()
  const cases = useDecisionCases(enabled)
  const ruleSets = useDecisionRuleSets(enabled && !!status?.staff)
  const { data: roles } = useJobDnaList()

  if (!status) {
    return (
      <div className="max-w-4xl">
        <JobDnaEmptyState>The decision path is not enabled for your organisation.</JobDnaEmptyState>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <JobDnaPageHeader
        icon={Scale}
        title="Decision path"
        description="Check a candidate against your organisation's written minimum standard, see the advisory route, and record the decision and its reason."
        action={
          status.staff ? (
            <JobDnaLinkButton to={ROUTES.JOB_DNA.DECISION_PATH_RULE_SETS}>
              <ListChecks className="h-4 w-4" />
              Rule sets
            </JobDnaLinkButton>
          ) : undefined
        }
      />

      {status.staff ? (
        <JobDnaCardSurface>
          <h2 className="mb-3 text-sm font-semibold text-[#1f2937]">New candidate</h2>
          {ruleSets.isLoading ? (
            <JobDnaLoading label="Loading rule sets…" />
          ) : (ruleSets.data ?? []).some((r) => r.status === "active") ? (
            <IntakeForm
              status={status}
              roles={(roles ?? []).filter((r) => r.status === "active")}
              ruleSets={ruleSets.data ?? []}
              onOpened={(id) => navigate(ROUTES.JOB_DNA.decisionPathCase(id))}
            />
          ) : (
            <p className="text-sm text-[#6b7280]">
              Activate a rule set before opening a case. <Link className="underline" to={ROUTES.JOB_DNA.DECISION_PATH_RULE_SETS}>Rule sets</Link>
            </p>
          )}
        </JobDnaCardSurface>
      ) : null}

      <JobDnaCardSurface>
        <h2 className="mb-3 text-sm font-semibold text-[#1f2937]">Cases</h2>
        {cases.isLoading ? (
          <JobDnaLoading label="Loading cases…" />
        ) : cases.isError ? (
          <p role="alert" className="text-sm text-red-600">
            Could not load the cases.
          </p>
        ) : (cases.data ?? []).length === 0 ? (
          <p className="text-sm text-[#6b7280]">No cases yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-[#6b7280]">
              <tr>
                <th>Candidate</th>
                <th>Status</th>
                <th>Recommended (advisory)</th>
                <th>Decided</th>
              </tr>
            </thead>
            <tbody>
              {(cases.data ?? []).map((c) => (
                <tr key={c.id} className="border-t border-[#f3f4f6]">
                  <td className="py-1">
                    <Link className="text-[#7C3AED] underline" to={ROUTES.JOB_DNA.decisionPathCase(c.id)}>
                      {c.candidateName ?? "(name removed)"}
                    </Link>
                  </td>
                  <td>{c.status}</td>
                  <td>{c.recommendedRoute ? ROUTE_LABEL[c.recommendedRoute] : "—"}</td>
                  <td>{c.finalRoute ? ROUTE_LABEL[c.finalRoute] : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </JobDnaCardSurface>
    </div>
  )
}
