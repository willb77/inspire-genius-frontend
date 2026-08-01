import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import {
  ArrowRight,
  Check,
  CircleDashed,
  Loader2,
  Lock,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { useJourney, useResetJourney } from "@/hooks/direction-setting/useJourney"
import type { JourneyStage, StageState } from "@/types/direction-setting"

/**
 * The journey map — the home surface of Direction Setting.
 *
 * Its single job is to answer "what is the one next thing?". Everything else on
 * the page is context for that answer.
 *
 * Two deliberate product choices, both worth preserving:
 *
 * 1. **Nothing is locked.** Every stage is enterable regardless of what came
 *    before. A stage missing its inputs explains what it is missing instead of
 *    refusing — a new user meeting a wall of padlocks is the exact failure the
 *    self-serve door exists to avoid.
 * 2. **The next action is the first INCOMPLETE stage, not the furthest
 *    reached.** Someone who got to job matches but never did the goal interview
 *    is sent back to the goal interview, because everything downstream of it is
 *    reading half a person. That decision is made server-side; this page renders
 *    it rather than recomputing it.
 */

/** Where each stage id lives. Ids are the backend's, so this map is the seam. */
const STAGE_ROUTE: Record<string, string> = {
  "0": ROUTES.DIRECTION_SETTING.ESTABLISH,
  "1": ROUTES.DIRECTION_SETTING.ESTABLISH,
  "2": ROUTES.DIRECTION_SETTING.PORTRAIT,
  "3": ROUTES.DIRECTION_SETTING.CAREERS,
  "4": ROUTES.DIRECTION_SETTING.SALARY,
  "5": ROUTES.DIRECTION_SETTING.GOALS,
  "6": ROUTES.DIRECTION_SETTING.ALIGNMENT,
  "7": ROUTES.DIRECTION_SETTING.MATCHES,
  "8": ROUTES.DIRECTION_SETTING.MATCHES,
  "9": ROUTES.DIRECTION_SETTING.PLAN,
  "10": ROUTES.DIRECTION_SETTING.PLAN,
  "11": ROUTES.DIRECTION_SETTING.INTERVIEW,
  "12": ROUTES.DIRECTION_SETTING.REHEARSE,
}

/** Plain-language reason a stage will be thin, keyed by the backend's `needs`. */
const NEEDS_LABEL: Record<string, string> = {
  prism: "your PRISM results",
  goals: "your goals",
  careers: "your career areas",
  blueprints: "published role benchmarks",
  gaps: "your gap analysis",
  plan: "your plan",
  salary: "salary data",
  guide: "your interview guide",
}

function StateIcon({ state }: { state: StageState }) {
  if (state === "complete") {
    return <Check className="h-4 w-4 text-emerald-600" aria-hidden />
  }
  if (state === "in_progress") {
    return <Loader2 className="h-4 w-4 text-primary" aria-hidden />
  }
  if (state === "skipped") {
    return <CircleDashed className="h-4 w-4 text-muted-foreground" aria-hidden />
  }
  return <CircleDashed className="h-4 w-4 text-muted-foreground/50" aria-hidden />
}

function StageRow({
  stage,
  isNext,
  onOpen,
}: {
  stage: JourneyStage
  isNext: boolean
  onOpen: (id: string) => void
}) {
  const done = stage.state === "complete" || stage.state === "skipped"
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(stage.id)}
        aria-current={isNext ? "step" : undefined}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
          isNext
            ? "border-primary bg-primary/5"
            : "border-border bg-background hover:border-primary/50"
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-medium",
            done
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : isNext
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-muted text-muted-foreground"
          )}
        >
          {stage.id}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-medium">{stage.name}</span>
            <StateIcon state={stage.state} />
            {isNext && (
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                Next
              </span>
            )}
          </span>
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {stage.question}
          </span>
          <span className="mt-1 block text-xs text-muted-foreground/80">
            {stage.outcome}
          </span>
          {!done && stage.needs.length > 0 && (
            <span className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" aria-hidden />
              Thin without{" "}
              {stage.needs.map((n) => NEEDS_LABEL[n] ?? n).join(" and ")} — you can
              still open it
            </span>
          )}
        </span>

        <ArrowRight
          className="mt-1 h-4 w-4 shrink-0 text-muted-foreground"
          aria-hidden
        />
      </button>
    </li>
  )
}

export default function JourneyPage() {
  const navigate = useNavigate()
  const { data: journey, isLoading, isError } = useJourney()
  const reset = useResetJourney()

  const open = (id: string) => {
    const to = STAGE_ROUTE[id]
    if (to) navigate(to)
  }

  const progress = useMemo(() => {
    const stages = journey?.stages ?? []
    if (!stages.length) return { done: 0, total: 0, pct: 0 }
    const done = stages.filter(
      (s) => s.state === "complete" || s.state === "skipped"
    ).length
    return { done, total: stages.length, pct: Math.round((done / stages.length) * 100) }
  }, [journey])

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Loading your journey…
        </div>
      </div>
    )
  }

  if (isError || !journey) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load your journey just now. Refresh to try again — nothing
              you&apos;ve done has been lost.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const next = journey.nextAction
  const finished = next.id === null

  return (
    <div className="space-y-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Direction Setting</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          A guided path from &ldquo;I don&apos;t know what I should be doing&rdquo; to a
          named role, an honest read of the gap, and a plan to close it. Come back to
          it whenever — nothing here expires, and every step is saved.
        </p>
      </header>

      {/* The one next action. The whole page exists to render this card. */}
      <Card className="border-primary/30 bg-primary/[0.03]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {finished ? "You've been all the way through" : "Your next step"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">
              {finished ? next.outcome : `${next.name} — ${next.question}`}
            </p>
            {!finished && (
              <p className="mt-1 text-sm text-muted-foreground">{next.outcome}</p>
            )}
          </div>
          {!finished && next.id && (
            <Button type="button" onClick={() => open(next.id as string)}>
              {next.state === "in_progress" ? "Continue" : "Start"}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
          )}
        </CardContent>
      </Card>

      <section aria-labelledby="journey-progress">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="journey-progress" className="text-sm font-medium">
            All {progress.total} steps
          </h2>
          <span className="text-xs text-muted-foreground">
            {progress.done} of {progress.total} done
          </span>
        </div>
        <div
          className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={progress.pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Journey progress"
        >
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress.pct}%` }}
          />
        </div>

        <ul className="space-y-2">
          {journey.stages.map((s) => (
            <StageRow
              key={s.id}
              stage={s}
              isNext={s.id === next.id}
              onOpen={open}
            />
          ))}
        </ul>
      </section>

      {progress.done > 0 && (
        <footer className="border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={reset.isPending}
            onClick={() => reset.mutate()}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden />
            Start over
          </Button>
          <p className="mt-1 text-xs text-muted-foreground">
            Clears your progress through these steps. Your PRISM results, documents
            and goals are untouched.
          </p>
        </footer>
      )}
    </div>
  )
}
