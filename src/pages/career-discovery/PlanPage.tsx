import { useEffect } from "react"
import { Link } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SCHOOL_LEVELS } from "@/types/career-discovery"
import {
  discoveryErrorMessage,
  useAdvanceDiscovery,
  useDiscoveryPlan,
} from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, PayRange, StageHeader } from "./DiscoveryParts"
import { useDiscoveryContext } from "./discoveryContext"
import { STAGE_ROUTES } from "./stageRoutes"

/** My plan — one page of what the person has found so far. No invented numbers. */
export default function PlanPage() {
  const { journey } = useDiscoveryContext()
  const { data, isLoading, isError, error } = useDiscoveryPlan(journey.mayProceed)
  const { mutate } = useAdvanceDiscovery()
  const hasAreas = (data?.careerAreas.length ?? 0) > 0
  const done = journey.stageStatus.plan === "complete"
  useEffect(() => {
    if (hasAreas && !done) mutate({ stageId: "plan" })
  }, [hasAreas, done, mutate])

  if (isLoading) return <DiscoveryLoading label="Putting your plan together" />
  if (isError || !data) return <DiscoveryError message={discoveryErrorMessage(error)} />
  const level = SCHOOL_LEVELS.find((l) => l.value === data.schoolLevel)?.label
  return (
    <div className="space-y-6">
      <StageHeader title="My plan" lead="What you've found so far, and what to do next." />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Where you are</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>{level ?? "School level not set yet."}</p>
          <p className="text-muted-foreground">
            {data.interests.length ? `Into: ${data.interests.join(", ")}` : "No interests added yet."}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Career areas that suit you</CardTitle>
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
            <p className="text-muted-foreground">Not yet — do Career areas first.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Your goals</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p>{data.goalsCount ? `${data.goalsCount} goal(s) set.` : "No goals set yet."}</p>
          {data.alignment?.note ? <p className="text-muted-foreground">{data.alignment.note}</p> : null}
        </CardContent>
      </Card>
      {data.nextSteps.length ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Next steps</CardTitle>
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
      <p className="text-xs text-muted-foreground">
        Coming next: {data.comingNext.map((c) => c.name).join(" and ")}.
      </p>
    </div>
  )
}
