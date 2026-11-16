import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Scale, ListChecks } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import {
  useDecisionCases,
  useDecisionPathStatus,
  useDecisionRuleSets,
} from "@/hooks/job-blueprint/useDecisionPath"
import { IntakeForm } from "@/components/job-blueprint/decision-path/DecisionForms"
import { routeLabel } from "@/components/job-blueprint/decision-path/labels"
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
  const { t } = useTranslation("jobBlueprintPages")
  const status = useDecisionPathStatus()
  const enabled = status !== null
  const navigate = useNavigate()
  const cases = useDecisionCases(enabled)
  const ruleSets = useDecisionRuleSets(enabled && !!status?.staff)
  const { data: roles } = useJobDnaList()

  if (!status) {
    return (
      <div className="max-w-4xl">
        <JobDnaEmptyState>{t("decisionPath.notEnabled", { defaultValue: "The decision path is not enabled for your organisation." })}</JobDnaEmptyState>
      </div>
    )
  }

  return (
    <div className="max-w-6xl space-y-6">
      <JobDnaPageHeader
        icon={Scale}
        title={t("decisionPath.title", { defaultValue: "Decision path" })}
        description={t("decisionPath.description", { defaultValue: "Check a candidate against your organisation's written minimum standard, see the advisory route, and record the decision and its reason." })}
        action={
          status.staff ? (
            <JobDnaLinkButton to={ROUTES.JOB_DNA.DECISION_PATH_RULE_SETS}>
              <ListChecks className="h-4 w-4" />
              {t("decisionPath.ruleSets", { defaultValue: "Rule sets" })}
            </JobDnaLinkButton>
          ) : undefined
        }
      />

      {status.staff ? (
        <JobDnaCardSurface>
          <h2 className="mb-3 text-sm font-semibold text-[#1f2937]">{t("decisionPath.newCandidate", { defaultValue: "New candidate" })}</h2>
          {ruleSets.isLoading ? (
            <JobDnaLoading label={t("decisionPath.loadingRuleSets", { defaultValue: "Loading rule sets…" })} />
          ) : (ruleSets.data ?? []).some((r) => r.status === "active") ? (
            <IntakeForm
              status={status}
              roles={(roles ?? []).filter((r) => r.status === "active")}
              ruleSets={ruleSets.data ?? []}
              onOpened={(id) => navigate(ROUTES.JOB_DNA.decisionPathCase(id))}
            />
          ) : (
            <p className="text-sm text-[#6b7280]">
              {t("decisionPath.activateFirst", { defaultValue: "Activate a rule set before opening a case." })}{" "}
              <Link className="underline" to={ROUTES.JOB_DNA.DECISION_PATH_RULE_SETS}>
                {t("decisionPath.ruleSets", { defaultValue: "Rule sets" })}
              </Link>
            </p>
          )}
        </JobDnaCardSurface>
      ) : null}

      <JobDnaCardSurface>
        <h2 className="mb-3 text-sm font-semibold text-[#1f2937]">{t("decisionPath.cases", { defaultValue: "Cases" })}</h2>
        {cases.isLoading ? (
          <JobDnaLoading label={t("decisionPath.loadingCases", { defaultValue: "Loading cases…" })} />
        ) : cases.isError ? (
          <p role="alert" className="text-sm text-red-600">
            {t("decisionPath.casesFailed", { defaultValue: "Could not load the cases." })}
          </p>
        ) : (cases.data ?? []).length === 0 ? (
          <p className="text-sm text-[#6b7280]">{t("decisionPath.noCases", { defaultValue: "No cases yet." })}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-[#6b7280]">
              <tr>
                <th>{t("decisionPath.col.candidate", { defaultValue: "Candidate" })}</th>
                <th>{t("decisionPath.col.status", { defaultValue: "Status" })}</th>
                <th>{t("decisionPath.col.recommended", { defaultValue: "Recommended (advisory)" })}</th>
                <th>{t("decisionPath.col.decided", { defaultValue: "Decided" })}</th>
              </tr>
            </thead>
            <tbody>
              {(cases.data ?? []).map((c) => (
                <tr key={c.id} className="border-t border-[#f3f4f6]">
                  <td className="py-1">
                    <Link className="text-[#7C3AED] underline" to={ROUTES.JOB_DNA.decisionPathCase(c.id)}>
                      {c.candidateName ?? t("decisionPath.nameRemoved", { defaultValue: "(name removed)" })}
                    </Link>
                  </td>
                  <td>{c.status}</td>
                  <td>{c.recommendedRoute ? routeLabel(t, c.recommendedRoute) : "—"}</td>
                  <td>{c.finalRoute ? routeLabel(t, c.finalRoute) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </JobDnaCardSurface>
    </div>
  )
}
