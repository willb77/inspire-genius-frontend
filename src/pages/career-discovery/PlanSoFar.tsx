import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import type { DiscoveryJourney } from "@/types/career-discovery"
import { useDegreePlan } from "@/hooks/career-discovery/useCareerDiscovery"
import { useCareersJobsFlow } from "@/hooks/careers-jobs/useCareersJobsFlow"
import { useGoalTargetsEnabled } from "@/hooks/switches/useGoalTargetsEnabled"
import { useMyTargets } from "@/hooks/goals/useGoalTargets"
import { useVerticalAccess } from "@/verticals/core"
import { degreePlanSummary, MAX_PLAN_TARGETS } from "@/lib/career-discovery/planSoFar"

/**
 * Careers and Jobs Phase C-b — "Your plan so far", read-only, above the
 * Discovery plan page's own content. Composed from existing reads; links out to
 * the pages that edit each item. Renders nothing (no card, no request) unless
 * `careers_jobs_flow` is on, and nothing when no item applies.
 *
 * - Degree plan: only when the server returns one. No cost figure, ever (one
 *   pay source per page until the OEWS package lands).
 * - Careers and Jobs targets: only for an account holding `job-fit` AND with
 *   goal targets on. The server's `GET /goal-targets/mine` does not check the
 *   entitlement, so this gate is the boundary for what the block shows.
 *
 * CSA: docs/analysis/2026-11-26-careers-jobs-c-b-plan-block-build-csa.md (monorepo).
 */
export function PlanSoFar({ journey }: { journey: DiscoveryJourney }) {
  // Off (or loading, or failing): nothing below mounts, so the plan page makes
  // no new read and needs nothing it did not need before — the same shape as
  // B's phase strip.
  if (!useCareersJobsFlow()) return null
  return <PlanSoFarBody journey={journey} />
}

/** The block itself. Mounted only when `careers_jobs_flow` is on. */
function PlanSoFarBody({ journey }: { journey: DiscoveryJourney }) {
  const { t } = useTranslation("careerDiscoveryPages")
  const jobFit = useVerticalAccess("job-fit").hasAccess
  const educationOn = journey.stages.some((s) => s.id === "education" && s.available)
  const degree = useDegreePlan(journey.mayProceed && educationOn)
  const targetsOn = useGoalTargetsEnabled(jobFit)
  const targets = useMyTargets(jobFit && targetsOn)

  const summary = degree.isSuccess ? degreePlanSummary(degree.data) : null
  const roles = jobFit && targetsOn && targets.isSuccess ? (targets.data ?? []).slice(0, MAX_PLAN_TARGETS) : []
  if (!summary && roles.length === 0) return null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("planSoFarTitle", "Your plan so far")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {summary ? (
          <div>
            <Link className="font-medium underline" to={ROUTES.CAREER_DISCOVERY.DEGREE_PLAN}>
              {t("planSoFarDegree", { defaultValue: "Degree plan: {{program}}", program: summary.program })}
            </Link>
            {summary.termsLeft !== null ? (
              <p className="text-muted-foreground">
                {summary.finish
                  ? t("planSoFarTermsFinish", {
                      defaultValue: "Terms left: {{terms}}. Finishing {{finish}}.",
                      terms: summary.termsLeft,
                      finish: summary.finish,
                    })
                  : t("planSoFarTerms", { defaultValue: "Terms left: {{terms}}.", terms: summary.termsLeft })}
              </p>
            ) : null}
          </div>
        ) : null}
        {roles.length ? (
          <div>
            <p className="font-medium">{t("planSoFarTargets", "Roles you're working toward")}</p>
            <ul className="space-y-1">
              {roles.map((r) => (
                <li key={r.goalId}>
                  <Link className="underline" to={ROUTES.MY_GOALS.ROADMAP(r.goalId)}>
                    {r.roleTitle}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
