import { useEffect } from "react"
import {
  Check,
  CornerDownRight,
  Heart,
  Loader2,
  Mountain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAdvanceJourney, useJourney } from "@/hooks/direction-setting/useJourney"
import { useGoalSession } from "@/hooks/summit/useGoalSession"
import GoalInterviewPanel from "@/components/direction-setting/GoalInterviewPanel"
import type { StageState } from "@/types/direction-setting"

/**
 * Stage 5 — "What do I actually want?"
 *
 * **This page used to be a door.** It explained the step and sent people to
 * `/summit/*`, and its own header argued that was correct: Summit's surface is
 * a three-column shell with its own sub-nav and chat panel, so it could not be
 * embedded without forking or gutting it — and a second goal system would drift
 * from the first within a release, leaving a person with two lists of goals and
 * no idea which one counted.
 *
 * That reasoning was right about the risk and wrong about the options, and it
 * is now obsolete. The interview is no longer a surface: `useSummitInterview`
 * is a headless state machine over `/ask`, `/why-ladder` and `/synthesize`. So
 * the interview runs *here*, driving the same three routes against the same
 * store. There is still exactly one list of goals — this is a second way into
 * the same conversation, not a second conversation.
 *
 * And it is spoken. A goal interview is a conversation, and typing paragraphs
 * about why your job is going nowhere is a different and worse activity than
 * saying it out loud. Voice leads; text is one toggle away.
 *
 * The one thing worth defending in the copy: Summit does not collect
 * intentions. The WHY ladder walks each stated goal down — up to five rungs,
 * hard-stopped there in the backend — until it hits a value or an identity.
 * "Get a better job" is not a goal. What sits underneath it is.
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

  // Absent journey (still loading, or the fetch failed) is treated as
  // not_started rather than as an error state for the whole page. The page's
  // real job — explaining the step and pointing at Summit — does not depend on
  // the journey row, and refusing to render it because a progress marker failed
  // to load would be the wrong trade.
  const state: StageState = journey?.stageStatus?.[STAGE_ID] ?? "not_started"
  const goals = session?.goals ?? []

  /**
   * Mark the stage under way as soon as the interview actually starts.
   *
   * Fire-and-forget on purpose: the interview is the point, and making someone
   * wait on a progress write would be spending their patience on our
   * bookkeeping. If the write fails the worst case is the map still says "not
   * started", which the person can correct below.
   */
  useEffect(() => {
    if (state === "not_started" && goals.length === 0) return
    if (state !== "not_started") return
    advance.mutate({ stageId: STAGE_ID, state: "in_progress" })
    // `advance` is a stable mutation object; re-running on its identity would
    // re-post the same write.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, goals.length])

  /**
   * Goals came back — the stage has produced its artefact, so record it.
   *
   * This is what stage 5 exists to produce, and recording it here is what lets
   * the journey map move someone on to job matches without them having to
   * remember to press a button. They can still mark it done by hand below; this
   * just stops the common case depending on that.
   */
  const onGoalsSynthesised = (count: number) => {
    if (count > 0 && state !== "complete") {
      advance.mutate({ stageId: STAGE_ID, state: "complete" })
    }
  }

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

      {/* The interview itself. It used to be a link to Summit; it is now the
          conversation, in place. */}
      <GoalInterviewPanel onGoalsSynthesised={onGoalsSynthesised} />

      {/* Goals already banked. Reached without leaving the step, because the
          previous version sent people to a different room to look at them and
          they did not always come back. */}
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
                  <p className="text-sm font-medium">{goal.title}</p>
                  {/* The motivation is the WHY-ladder root. It is the whole
                      point of the interview, so it is shown with the goal
                      rather than hidden behind a detail view. */}
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

      {/* Why this step is not a list of new year's resolutions. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Goals with the reason underneath them
          </CardTitle>
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
                    <CornerDownRight
                      className="h-4 w-4 text-muted-foreground/60"
                      aria-hidden
                    />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground">
                    {rung.role}
                  </span>
                  <span
                    className={
                      "root" in rung && rung.root
                        ? "block text-sm font-medium"
                        : "block text-sm"
                    }
                  >
                    {rung.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>

          <p className="text-xs text-muted-foreground">
            Summit works through five areas of your life this way, and it does it
            gradually — you are never handed a questionnaire.
          </p>
        </CardContent>
      </Card>

      {isError && (
        <p className="text-xs text-muted-foreground">
          We couldn&apos;t read your progress just now, so this step may show as
          not started. The interview itself is unaffected.
        </p>
      )}

      {/* Only the person can say whether the conversation reached anything. */}
      {state !== "complete" && (
        <footer className="border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={advance.isPending}
            onClick={markDone}
          >
            {advance.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Check className="mr-1.5 h-4 w-4" aria-hidden />
            )}
            I&apos;ve set my goals — mark this step done
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            You can carry on adding to them afterwards. This just tells the map
            to move you on.
          </p>
        </footer>
      )}
    </div>
  )
}
