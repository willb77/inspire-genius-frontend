import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Check,
  CornerDownRight,
  Heart,
  Loader2,
  Mountain,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUTES } from "@/constants/routes"
import { useAdvanceJourney, useJourney } from "@/hooks/direction-setting/useJourney"
import type { StageState } from "@/types/direction-setting"

/**
 * Stage 5 — "What do I actually want?"
 *
 * **This page is a door, not an engine.** The goal interview already exists and
 * already works: Summit (the `GoalAgent`) runs it at `/summit/*` against the
 * live `/v1/agents/goals/*` endpoints — five-category discovery, the WHY ladder,
 * synthesis into goals. That surface is a full-screen three-column shell with
 * its own sub-nav and its own Meridian chat panel, so it cannot be embedded in
 * a Direction Setting page without either forking it or gutting it.
 *
 * Both of those are worse than a link. A second goal system would drift from
 * the first within a release, and the person would end up with two lists of
 * goals and no idea which one counted. So this page does three honest things:
 *
 * 1. Says what the step is for, in the words of someone who is out of work and
 *    tired of being asked to "define their objectives".
 * 2. Hands off to Summit, recording the handoff on the journey so the map knows
 *    this stage is under way.
 * 3. Lets the person say when they're done, because only they can tell whether
 *    the conversation actually reached anything.
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
  const navigate = useNavigate()
  const { data: journey, isLoading, isError } = useJourney()
  const advance = useAdvanceJourney()

  // Absent journey (still loading, or the fetch failed) is treated as
  // not_started rather than as an error state for the whole page. The page's
  // real job — explaining the step and pointing at Summit — does not depend on
  // the journey row, and refusing to render it because a progress marker failed
  // to load would be the wrong trade.
  const state: StageState = journey?.stageStatus?.[STAGE_ID] ?? "not_started"
  const started = state === "in_progress" || state === "complete"

  /**
   * Hand off to Summit, recording the start on the way out.
   *
   * Fire-and-forget on purpose: the interview is the point, and making someone
   * wait on a progress write before they can reach it would be spending their
   * patience on our bookkeeping. If the write fails the worst case is the map
   * still says "not started", which the person can correct below.
   */
  const openSummit = (to: string) => {
    if (state === "not_started") {
      advance.mutate({ stageId: STAGE_ID, state: "in_progress" })
    }
    navigate(to)
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

      {/* The handoff. Everything below this card is context for it. */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Mountain className="h-4 w-4 text-primary" aria-hidden />
            {started ? "Pick up where you left off" : "Start the conversation"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            The goal interview lives in Summit, which is a room of its own — a
            sub-nav down the side and Summit itself on the right to talk to. It
            opens in this same app, and this step stays exactly where it is when
            you come back.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => openSummit(ROUTES.SUMMIT.DISCOVERY)}
            >
              {started ? "Continue the goal interview" : "Start the goal interview"}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openSummit(ROUTES.SUMMIT.GOALS)}
            >
              See the goals I have so far
            </Button>
          </div>
        </CardContent>
      </Card>

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
