/**
 * Goals tab — Summit-powered. Renders formalized goals with WHY-root
 * motivation, PRISM alignment, execution style, success metric, reward-framed
 * first step, owning coach, and provisional/confirmed provenance.
 *
 * The manager can invite/resume a Summit session and co-ratify (never
 * overwrites the member's own ratification). Gates: prismNeeded → route to
 * Aura; goalsPending → invite CTA.
 */
import { CheckCircle2, MessageSquarePlus, Quote, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { QUADRANT_CONFIG, BEHAVIOUR_CONFIG } from "@/constants/prism"
import {
  GOAL_CATEGORY_LABEL,
  GOAL_HORIZON_LABEL,
  PRISM_ALIGNMENT_LABEL,
} from "@/constants/development"
import type {
  GoalCategory,
  GoalCategoryCoverage,
  PrismAlignment,
  SummitGoal,
} from "@/types/development"
import {
  useDevelopmentGoals,
  useGoalSession,
  useRatifyGoal,
} from "@/hooks/manager/development"

const CATEGORY_ORDER: GoalCategory[] = [
  "career_history",
  "current_job",
  "workplace_situation",
  "career_ambitions",
  "personal_goals",
]

function CoverageStrip({ coverage }: { coverage: GoalCategoryCoverage[] }) {
  const byCat = new Map(coverage.map((c) => [c.category, c.state]))
  const stateColor: Record<string, string> = {
    covered: "bg-emerald-500",
    in_progress: "bg-amber-400",
    not_started: "bg-slate-200",
  }
  return (
    <div className="flex flex-wrap gap-2" aria-label="Discovery coverage by category">
      {CATEGORY_ORDER.map((cat) => {
        const state = byCat.get(cat) ?? "not_started"
        return (
          <div key={cat} className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-600">
            <span className={cn("h-2 w-2 rounded-full", stateColor[state])} aria-hidden="true" />
            {GOAL_CATEGORY_LABEL[cat]}
            <span className="sr-only"> — {state.replace("_", " ")}</span>
          </div>
        )
      })}
    </div>
  )
}

function AlignmentBadge({ alignment }: { alignment: PrismAlignment }) {
  const parts: string[] = []
  if (alignment.dimensions?.length) {
    parts.push(alignment.dimensions.map((d) => BEHAVIOUR_CONFIG[d]?.label ?? `Dim ${d}`).join(", "))
  }
  if (alignment.quadrant) parts.push(`${QUADRANT_CONFIG[alignment.quadrant].label} quadrant`)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline" className="gap-1">
        <Sparkles className="h-3 w-3" aria-hidden="true" />
        {PRISM_ALIGNMENT_LABEL[alignment.kind]}
      </Badge>
      {parts.length > 0 ? <span className="text-xs text-slate-500">{parts.join(" · ")}</span> : null}
    </div>
  )
}

function GoalCard({
  goal,
  onRatify,
  ratifying,
}: {
  goal: SummitGoal
  onRatify: (goalId: string) => void
  ratifying: boolean
}) {
  const confirmed = goal.status === "confirmed"
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{goal.title}</CardTitle>
          <Badge variant={confirmed ? "default" : "secondary"} className="shrink-0 gap-1">
            {confirmed ? <CheckCircle2 className="h-3 w-3" aria-hidden="true" /> : null}
            {confirmed ? "Confirmed" : "Provisional"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          <Badge variant="outline">{GOAL_CATEGORY_LABEL[goal.category]}</Badge>
          <Badge variant="outline">{GOAL_HORIZON_LABEL[goal.horizon]}</Badge>
          <Badge variant="outline">Coach: {goal.ownerCoach}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div>
          <div className="text-xs font-semibold text-slate-500">Why it matters</div>
          <p className="text-slate-700">{goal.motivation}</p>
        </div>
        <AlignmentBadge alignment={goal.prismAlignment} />
        {goal.prismAlignment.note ? (
          <p className="text-xs text-slate-500">{goal.prismAlignment.note}</p>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs font-semibold text-slate-500">Execution style</div>
            <p className="text-slate-700">{goal.executionStyle}</p>
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-500">Success metric</div>
            <p className="text-slate-700">{goal.successMetric}</p>
          </div>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2.5">
          <div className="text-xs font-semibold text-emerald-700">Reward-framed first step</div>
          <p className="text-emerald-800">{goal.firstStep}</p>
        </div>
        {goal.provenanceQuotes.length > 0 ? (
          <details className="text-xs text-slate-500">
            <summary className="cursor-pointer font-medium">Provenance ({goal.provenanceQuotes.length})</summary>
            <ul className="mt-1 space-y-1">
              {goal.provenanceQuotes.map((q, i) => (
                <li key={i} className="flex gap-1.5">
                  <Quote className="mt-0.5 h-3 w-3 shrink-0 text-slate-300" aria-hidden="true" />
                  <span className="italic">“{q}”</span>
                </li>
              ))}
            </ul>
          </details>
        ) : null}
        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRatify(goal.goalId)}
            disabled={ratifying}
          >
            <MessageSquarePlus className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
            Co-ratify
          </Button>
          <span className="text-[11px] text-slate-400">Managers co-sign — the member’s own ratification is never overwritten.</span>
        </div>
      </CardContent>
    </Card>
  )
}

export type GoalsPanelProps = {
  memberId: string
}

export function GoalsPanel({ memberId }: GoalsPanelProps) {
  const { data, isLoading } = useDevelopmentGoals(memberId)
  const session = useGoalSession(memberId)
  const ratify = useRatifyGoal(memberId)

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-slate-400">Loading goals…</div>
  }

  const goals = data?.goals ?? []
  const coverage = data?.coverage ?? []

  // PRISM-needed gate
  if (data?.prismNeeded) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-start gap-3 p-6">
          <h3 className="text-base font-semibold text-slate-800">PRISM needed</h3>
          <p className="text-sm text-slate-500">
            Set this member up with Aura to map their PRISM profile before goal discovery can begin.
          </p>
          <Button
            onClick={() => session.mutate("invite")}
            disabled={session.isPending}
          >
            Set up with Aura
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Goals-pending gate
  if (data?.goalsPending || goals.length === 0) {
    return (
      <div className="space-y-4">
        <CoverageStrip coverage={coverage} />
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-start gap-3 p-6">
            <h3 className="text-base font-semibold text-slate-800">No goals discovered yet</h3>
            <p className="text-sm text-slate-500">
              Invite this member to a Summit discovery session to formalize their goals.
            </p>
            <Button onClick={() => session.mutate("invite")} disabled={session.isPending}>
              Invite to Summit session
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CoverageStrip coverage={coverage} />
        <Button
          size="sm"
          variant="outline"
          onClick={() => session.mutate("resume")}
          disabled={session.isPending}
        >
          Resume session
        </Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {goals.map((goal) => (
          <GoalCard
            key={goal.goalId}
            goal={goal}
            onRatify={(goalId) => ratify.mutate({ goalId })}
            ratifying={ratify.isPending}
          />
        ))}
      </div>
    </div>
  )
}
