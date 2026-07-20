/**
 * Learning & Training tab — items grouped by gap/goal, with provider, est
 * hours, format, status/progress/quiz, an "Assign" action (links to the
 * manager training surface), and a behavioral pacing note.
 */
import { useNavigate } from "react-router-dom"
import { BookOpen, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ROUTES } from "@/constants/routes"
import { LEARNING_STATUS_LABEL } from "@/constants/development"
import type { DevelopmentGap, LearningItem, SummitGoal } from "@/types/development"

function LearningItemRow({ item, onAssign }: { item: LearningItem; onAssign: () => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
            <BookOpen className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span className="truncate">{item.title}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{item.provider}</span>
            {item.estHours ? (
              <span className="inline-flex items-center gap-0.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {item.estHours}h
              </span>
            ) : null}
            {item.format ? <Badge variant="outline" className="capitalize">{item.format}</Badge> : null}
          </div>
        </div>
        <Badge variant={item.status === "complete" ? "default" : "secondary"} className="shrink-0">
          {LEARNING_STATUS_LABEL[item.status]}
        </Badge>
      </div>
      {typeof item.progress === "number" ? (
        <Progress value={item.progress} className="h-1.5" aria-label={`Progress ${item.progress}%`} />
      ) : null}
      <div className="flex items-center justify-between">
        {typeof item.quizScore === "number" ? (
          <span className="text-xs text-slate-500">Quiz: {item.quizScore}%</span>
        ) : (
          <span />
        )}
        <Button size="sm" variant="outline" onClick={onAssign}>
          Assign
        </Button>
      </div>
    </div>
  )
}

export type LearningPlanPanelProps = {
  learning: LearningItem[]
  gaps: DevelopmentGap[]
  goals: SummitGoal[]
}

export function LearningPlanPanel({ learning, gaps, goals }: LearningPlanPanelProps) {
  const navigate = useNavigate()

  if (learning.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center text-sm text-slate-500">
          No learning items yet. Close a gap to seed one.
        </CardContent>
      </Card>
    )
  }

  // Group by gap first, then goal, then "General".
  const gapLabel = new Map(gaps.map((g) => [g.gapId, g.competency]))
  const goalLabel = new Map(goals.map((g) => [g.goalId, g.title]))

  const groups = new Map<string, LearningItem[]>()
  for (const item of learning) {
    const key = item.gapId
      ? `Gap: ${gapLabel.get(item.gapId) ?? item.gapId}`
      : item.goalId
        ? `Goal: ${goalLabel.get(item.goalId) ?? item.goalId}`
        : "General"
    const arr = groups.get(key) ?? []
    arr.push(item)
    groups.set(key, arr)
  }

  const assign = () => navigate(ROUTES.MANAGER.TRAINING)

  return (
    <div className="space-y-5">
      <p className="rounded-md bg-slate-50 p-2.5 text-xs text-slate-500">
        Pacing note: items are sequenced to match this member’s behavioral learning preference —
        avoid front-loading; space experiential items between reflective ones.
      </p>
      {Array.from(groups.entries()).map(([group, items]) => (
        <div key={group} className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <LearningItemRow key={item.itemId} item={item} onAssign={assign} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
