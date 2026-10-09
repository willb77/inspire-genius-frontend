/**
 * The simulated result of a scored practice interview (3.4 Phase 4).
 *
 * Every number on it is labelled simulated: each answer was scored by the
 * model and rolled up by the same scorer a live interview uses. The band is an
 * alignment band, never a hiring instruction (the platform does not issue
 * those). "Make this a goal" turns the weakest-scored competency into a draft
 * goal in Goals Studio, naming where it came from.
 */
import { Target } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCreateGoal } from "@/hooks/summit/useMyGoals"
import type { ScoredPracticeResult } from "@/services/interview/scoredPractice.service"

const BAND_LABEL: Record<string, string> = {
  "strong-alignment": "Strong alignment",
  "good-alignment": "Good alignment",
  "partial-alignment": "Partial alignment",
  "limited-alignment": "Limited alignment",
}

function bandLabel(band: string): string {
  return BAND_LABEL[band] ?? band
}

export default function SimulatedResultCard({
  result,
  competencyNames,
  roleTitle,
}: {
  result: ScoredPracticeResult
  /** competency id → the name the interview showed. */
  competencyNames: Record<string, string>
  roleTitle?: string
}) {
  const createGoal = useCreateGoal()
  const scored = result.answers.filter((a): a is typeof a & { score: number } => typeof a.score === "number")
  const weakest = scored.length
    ? scored.reduce((min, a) => (a.score < min.score ? a : min), scored[0])
    : null
  const weakestName = weakest ? competencyNames[weakest.competency_id] ?? weakest.competency_id : null

  const makeGoal = () => {
    if (!weakest || !weakestName) return
    const when = new Date().toLocaleDateString()
    createGoal.mutate(
      {
        title: `Get stronger at ${weakestName}`,
        category: "job",
        motivation:
          `From interview practice${roleTitle ? ` for ${roleTitle}` : ""} on ${when}: ` +
          `${weakestName} scored ${weakest.score} of 5 (simulated).`,
      },
      {
        onSuccess: () => toast.success("Added to Goals Studio as a draft goal."),
        onError: () => toast.error("The goal couldn't be added. Try again from Goals Studio."),
      },
    )
  }

  return (
    <Card data-testid="simulated-result">
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Simulated result — practice only</CardTitle>
        <p className="text-xs text-muted-foreground">{result.notice}</p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-2xl font-semibold" data-testid="simulated-score">
            {result.overall_score.toFixed(1)}
          </span>
          <span className="text-muted-foreground">of 5</span>
          <Badge variant="secondary" data-testid="simulated-band">{bandLabel(result.recommendation)}</Badge>
        </div>
        <ul className="space-y-1">
          {result.answers.map((a) => (
            <li key={a.competency_id} className="flex justify-between gap-3">
              <span>{competencyNames[a.competency_id] ?? a.competency_id}</span>
              <span className="tabular-nums">{a.score ?? "—"} / 5</span>
            </li>
          ))}
        </ul>
        {weakest && weakestName ? (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={makeGoal} disabled={createGoal.isPending}>
              <Target className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Make “{weakestName}” a goal
            </Button>
            {createGoal.isSuccess ? (
              <span className="text-xs text-muted-foreground" role="status">Added to Goals Studio.</span>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
