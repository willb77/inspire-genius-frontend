import { useEffect } from "react"
import { Link } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { SCHOOL_LEVELS } from "@/types/career-discovery"
import {
  discoveryErrorMessage,
  useAdvanceDiscovery,
  useDiscoveryPlan,
} from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, PayRange, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"
import { STAGE_ROUTES } from "./stageRoutes"
import { isHouseStyleOn } from "@/lib/house/areaSwitch"
import { learningOf } from "@/lib/career-discovery/learningSection"
import { LearningButtons } from "./LearningParts"
import { PlanSoFar } from "./PlanSoFar"

/** My plan — one page of what the person has found so far. No invented numbers. */
export default function PlanPage() {
  const { t } = useTranslation("careerDiscoveryPages")
  const { journey } = useDiscoveryContext()
  const { data, isLoading, isError, error } = useDiscoveryPlan(journey.mayProceed)
  const { mutate } = useAdvanceDiscovery()
  const hasAreas = (data?.careerAreas.length ?? 0) > 0
  const done = journey.stageStatus.plan === "complete"
  // JF-10 (D8): My Plan stays, as one of the four Learning and Education buttons.
  const learning = learningOf(journey.stages)
  useEffect(() => {
    if (hasAreas && !done) mutate({ stageId: "plan" })
  }, [hasAreas, done, mutate])

  if (isLoading) return <DiscoveryLoading label={t("planLoading", "Putting your plan together")} />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  const level = SCHOOL_LEVELS.find((l) => l.value === data.schoolLevel)?.label
  return (
    <div className="space-y-6">
      <StageHeader
        title={t("planTitle", "My plan")}
        lead={t("planLead", "What you've found so far, and what to do next.")}
      />
      {learning ? <LearningButtons learning={learning} current="plan" /> : null}
      {/* Phase C-a/b: renders nothing unless careers_jobs_flow is on and an item applies. */}
      <PlanSoFar journey={journey} />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("planWhereYouAre", "Where you are")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{level ?? t("planNoLevel", "School level not set yet.")}</p>
          <p className="text-muted-foreground">
            {data.interests.length
              ? t("planInterests", { defaultValue: "Into: {{interests}}", interests: data.interests.join(", ") })
              : t("planNoInterests", "No interests added yet.")}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("planCareerAreasTitle", "Career areas that suit you")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {hasAreas ? (
            data.careerAreas.map((a) => (
              <div key={a.family}>
                <p className="font-medium">{a.family}</p>
                <PayRange range={a.range} />
              </div>
            ))
          ) : (
            <p className="text-muted-foreground">{t("planNoAreas", "Not yet — do Career areas first.")}</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          {/* O-CBW-b (2026-11-27): goalsCount is this journey's goals step
              (career_discovery.py `artefacts.goals.count`), not Goals Studio.
              Say so, so it cannot read as "you have no goals" beside a list of
              Goals Studio targets. */}
          <CardTitle className="text-base">{t("planGoalsTitle", "Goals from this journey")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {data.goalsCount ? (
            <p>{t("planGoalsSet", { defaultValue: "{{goals}} goal(s) set.", goals: data.goalsCount })}</p>
          ) : (
            <p>
              {t("planNoGoals", "You haven't done the goals step yet.")}{" "}
              <Link className="underline" to={ROUTES.MY_GOALS.BASE}>
                {t("planGoalsStudioLink", "Open Goals Studio")}
              </Link>
            </p>
          )}
          {data.alignment?.note ? <p className="text-muted-foreground">{data.alignment.note}</p> : null}
        </CardContent>
      </Card>
      {data.educationPaths ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{learning ? t("planLearningPath", "Learning and Education Path") : t("planEducationPaths", "Education paths")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {data.educationPaths.length ? (
              data.educationPaths.map((e) => (
                <p key={`${e.careerArea}-${e.field}`}>
                  {e.field} <span className="text-muted-foreground">— {e.credential}, for {e.careerArea}</span>
                </p>
              ))
            ) : (
              <p className="text-muted-foreground">
                {t("planNotYetDo", {
                  defaultValue: "Not yet — do {{stage}} first.",
                  stage: learning ? t("planLearningPath", "Learning and Education Path") : t("planEducationPaths", "Education paths"),
                })}
              </p>
            )}
          </CardContent>
        </Card>
      ) : null}
      {data.nextSteps.length ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("planNextSteps", "Next steps")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1 text-sm">
              {data.nextSteps.map((s) => (
                <li key={s.stageId}>
                  <Link className="underline" to={STAGE_ROUTES[s.stageId]}>
                    {s.name}
                  </Link>{" "}
                  — <span className="text-muted-foreground">{s.question}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
      {/* House style: nothing pending, no "Coming next: ." line. */}
      {data.comingNext.length > 0 || !isHouseStyleOn("career-education") ? (
        <p className="text-xs text-muted-foreground">
          {t("planComingNext", {
            defaultValue: "Coming next: {{names}}.",
            names: data.comingNext.map((c) => c.name).join(t("planAnd", " and ")),
          })}
        </p>
      ) : null}
    </div>
  )
}
