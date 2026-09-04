import { useEffect } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Check,
  CornerDownRight,
  Heart,
  Mountain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import {
  useAdvanceJourney,
  useJourney,
  useRecordStageComplete,
} from "@/hooks/direction-setting/useJourney"
import { useGoalSession } from "@/hooks/summit/useGoalSession"
import type { StageState } from "@/types/direction-setting"

/**
 * Stage 5 — "What do I actually want?"
 *
 * This page was a door, then it was the interview, and it is a door again —
 * for a better reason this time. The interview now lives at My Goals
 * (Goals offering, Phase 3), which every user reaches from the menu whether
 * or not they are on this journey, and which is also where a goal gets
 * published and shared. Running a second copy of the conversation here would
 * mean two places to confirm a goal and two places to get it wrong.
 *
 * So this page explains the step, sends the person to My Goals with a way
 * back, and records the stage from what they did there: in progress once the
 * session holds any goal, complete once one is confirmed.
 */

/** The backend's id for this stage. See `stages.py`. */
const STAGE_ID = "5"

/** The rungs, as a person actually experiences them. Illustration, not data. */
const LADDER_EXAMPLE = [
  { role: "You say", body: "I want a better job." },
  { role: "Why does that matter?", body: "Because this one is going nowhere." },
  { role: "And why does that matter?", body: "I've stopped learning anything." },
  {
    role: "And underneath that?",
    body: "I want to be someone who's still getting better at something.",
    root: true,
  },
] as const

function StageBadge({ state }: { state: StageState }) {
  if (state === "complete") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
        <Check className="h-3 w-3" aria-hidden />
        Done
      </span>
    )
  }
  if (state === "in_progress") {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
        In progress
      </span>
    )
  }
  return null
}

export default function GoalsPage() {
  const { data: journey, isLoading, isError } = useJourney()
  const { data: session } = useGoalSession()
  const advance = useAdvanceJourney()
  const state: StageState = journey?.stageStatus?.[STAGE_ID] ?? "not_started"
  const goals = session?.goals ?? []
  const confirmed = goals.filter((g) => g.status === "confirmed").length

  /**
   * Under way as soon as the session holds a goal — the person has started the
   * conversation at My Goals and come back. Fire-and-forget: if the write fails
   * the map still says "not started", which they can correct below.
   */
  useEffect(() => {
    if (state !== "not_started" || goals.length === 0) return
    advance.mutate({ stageId: STAGE_ID, state: "in_progress" })
    // `advance` is a stable mutation object; re-running on its identity would
    // re-post the same write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, goals.length])

  /**
   * Complete once a goal is confirmed — that is the artefact this stage exists
   * to produce. Recorded on return from My Goals, so the map moves on without
   * the person having to remember a button. Never walks the stage backwards.
   */
  useRecordStageComplete(STAGE_ID, confirmed > 0)

  const markDone = () => {
    advance.mutate({ stageId: STAGE_ID, state: "complete" })
  }

  return (
    <div className="space-y-6 p-6">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">What do I actually want?</h1>
          {!isLoading && <StageBadge state={state} />}
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Step 5 of the journey. This is a conversation, not a form — you talk it
          through with Summit over as many sittings as you need, and it keeps
          everything between visits.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mountain className="h-4 w-4 text-primary" aria-hidden />
            Your goals live in one place
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The interview, your drafts, publishing and who can see them are all at
            My Goals. This step is done when you have confirmed a goal there — the
            map picks that up when you come back.
          </p>
          <Button asChild>
            <Link to={`${ROUTES.MY_GOALS.BASE}?journey=direction-setting`}>
              Go to My Goals
              <ArrowRight className="ml-2 h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {goals.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mountain className="h-4 w-4 text-primary" aria-hidden />
              The goals you have so far
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {goals.map((goal) => (
                <li key={goal.goal_id} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-sm font-medium">
                    {goal.title}
                    {goal.status === "confirmed" && (
                      <span className="ml-2 text-xs font-normal text-emerald-700">confirmed</span>
                    )}
                  </p>
                  {goal.motivation && (
                    <p className="mt-0.5 flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Heart className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" aria-hidden />
                      {goal.motivation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Goals with the reason underneath them</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Most goal-setting stops at the first answer, which is why most goals
            don&apos;t survive a bad week. Summit keeps asking why — up to five
            times, and no further — until it reaches something you actually care
            about rather than something you think you should say. That root is
            what everything after this step gets aimed at.
          </p>
          <ol className="space-y-2" aria-label="How the WHY ladder works">
            {LADDER_EXAMPLE.map((rung) => (
              <li key={rung.role} className="flex gap-2.5">
                <span className="mt-0.5 shrink-0">
                  {"root" in rung && rung.root ? (
                    <Heart className="h-4 w-4 text-amber-600" aria-hidden />
                  ) : (
                    <CornerDownRight className="h-4 w-4 text-muted-foreground/60" aria-hidden />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {rung.role}
                  </span>
                  <span className={"root" in rung && rung.root ? "block text-sm font-medium" : "block text-sm"}>
                    {rung.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {isError && (
        <p className="text-xs text-muted-foreground">
          We couldn&apos;t read your progress just now, so this step may show as
          not started. Your goals themselves are unaffected.
        </p>
      )}

      {state !== "complete" && (
        <footer className="border-t pt-4">
          <Button type="button" variant="ghost" onClick={markDone} disabled={advance.isPending}>
            <Check className="mr-2 h-4 w-4" aria-hidden />
            Mark this step done
          </Button>
        </footer>
      )}
    </div>
  )
}
