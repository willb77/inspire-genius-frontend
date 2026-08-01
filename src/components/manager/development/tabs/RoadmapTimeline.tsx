/**
 * Roadmap tab — horizon lanes (30/60/90 → quarters → 12mo+) of milestones
 * linked to goals, gaps and learning items. Shows an overall on-track/at-risk
 * signal + next-best-action, a "Share plan" action, and a list/table fallback
 * for accessibility and narrow viewports.
 */
import { AlertTriangle, CheckCircle2, Share2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  MILESTONE_HORIZON_LABEL,
  MILESTONE_HORIZON_ORDER,
  MILESTONE_STATUS_LABEL,
} from "@/constants/development"
import type { Milestone, MilestoneStatus, SummitGoal } from "@/types/development"
import { useSharePlan, useUpdateMilestone } from "@/hooks/manager/development"
import { useDevSkin } from "../skin"

const STATUS_BADGE: Record<MilestoneStatus, "default" | "secondary" | "destructive" | "outline"> = {
  planned: "outline",
  in_progress: "secondary",
  done: "default",
  blocked: "destructive",
}

function MilestoneItem({
  milestone,
  goalTitle,
  onStatusChange,
}: {
  milestone: Milestone
  goalTitle?: string
  onStatusChange: (status: MilestoneStatus) => void
}) {
  const sk = useDevSkin()
  return (
    <div className={cn("rounded-lg border bg-white p-3", sk.border100)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={cn("truncate text-sm font-medium", sk.text800)}>{milestone.title}</div>
          {goalTitle ? <div className={cn("truncate text-xs", sk.text500)}>Goal: {goalTitle}</div> : null}
        </div>
        <Badge variant={STATUS_BADGE[milestone.status]} className="shrink-0">
          {MILESTONE_STATUS_LABEL[milestone.status]}
        </Badge>
      </div>
      <div className={cn("mt-2 flex flex-wrap items-center gap-2 text-[11px]", sk.text400)}>
        {milestone.dueDate ? <span>Due {new Date(milestone.dueDate).toLocaleDateString()}</span> : null}
        {milestone.gapIds?.length ? <span>{milestone.gapIds.length} gap(s)</span> : null}
        {milestone.learningItemIds?.length ? <span>{milestone.learningItemIds.length} learning item(s)</span> : null}
      </div>
      {milestone.status === "blocked" && milestone.blockedReason ? (
        <p className="mt-1 text-xs text-red-600">Blocked: {milestone.blockedReason}</p>
      ) : null}
      <div className="mt-2">
        <Select value={milestone.status} onValueChange={(v) => onStatusChange(v as MilestoneStatus)}>
          <SelectTrigger className="h-7 w-[140px] text-xs" aria-label={`Update status for ${milestone.title}`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(MILESTONE_STATUS_LABEL) as MilestoneStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {MILESTONE_STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export type RoadmapTimelineProps = {
  memberId: string
  milestones: Milestone[]
  goals: SummitGoal[]
  trajectory?: "on_track" | "at_risk"
}

export function RoadmapTimeline({ memberId, milestones, goals, trajectory }: RoadmapTimelineProps) {
  const sk = useDevSkin()
  const share = useSharePlan(memberId)
  const update = useUpdateMilestone(memberId)
  const goalTitle = new Map(goals.map((g) => [g.goalId, g.title]))

  const nextBestAction = (() => {
    const blocked = milestones.find((m) => m.status === "blocked")
    if (blocked) return `Unblock: ${blocked.title}`
    const inProgress = milestones.find((m) => m.status === "in_progress")
    if (inProgress) return `Keep momentum on: ${inProgress.title}`
    const planned = [...milestones].sort((a, b) => a.sequence - b.sequence).find((m) => m.status === "planned")
    if (planned) return `Start: ${planned.title}`
    return "All milestones complete — schedule a review."
  })()

  const atRisk = trajectory === "at_risk"

  if (milestones.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className={cn("p-6 text-center text-sm", sk.text500)}>
          No milestones planned yet.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className={cn("flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between", sk.border200)}>
        <div className="flex items-center gap-2">
          {atRisk ? (
            <AlertTriangle className="h-5 w-5 text-red-500" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
          )}
          <div>
            <div className={cn("text-sm font-semibold", atRisk ? "text-red-700" : "text-emerald-700")}>
              {atRisk ? "At risk" : "On track"}
            </div>
            <div className={cn("text-xs", sk.text500)}>Next best action: {nextBestAction}</div>
          </div>
        </div>
        <Button size="sm" onClick={() => share.mutate({ includePdf: true })} disabled={share.isPending}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          Share plan
        </Button>
      </div>

      {/* Horizon lanes (scrolls horizontally on narrow viewports) */}
      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-4 pb-2">
          {MILESTONE_HORIZON_ORDER.map((horizon) => {
            const lane = milestones
              .filter((m) => m.horizon === horizon)
              .sort((a, b) => a.sequence - b.sequence)
            return (
              <Card key={horizon} className="w-72 shrink-0">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{MILESTONE_HORIZON_LABEL[horizon]}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {lane.length === 0 ? (
                    <p className={cn("text-xs", sk.text400)}>No milestones in this lane.</p>
                  ) : (
                    lane.map((m) => (
                      <MilestoneItem
                        key={m.milestoneId}
                        milestone={m}
                        goalTitle={goalTitle.get(m.goalId)}
                        onStatusChange={(status) => update.mutate({ milestoneId: m.milestoneId, status })}
                      />
                    ))
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Accessible list/table fallback */}
      <details className={cn("rounded-lg border p-3", sk.border200)}>
        <summary className={cn("cursor-pointer text-sm font-medium", sk.text600)}>
          View as list (accessible)
        </summary>
        <ul className="mt-2 space-y-1 text-sm">
          {[...milestones]
            .sort((a, b) => MILESTONE_HORIZON_ORDER.indexOf(a.horizon) - MILESTONE_HORIZON_ORDER.indexOf(b.horizon) || a.sequence - b.sequence)
            .map((m) => (
              <li key={m.milestoneId} className={cn("flex items-center justify-between gap-2 border-b py-1 last:border-0", sk.border100)}>
                <span className="truncate">
                  <span className={sk.text400}>{MILESTONE_HORIZON_LABEL[m.horizon]}: </span>
                  {m.title}
                </span>
                <Badge variant={STATUS_BADGE[m.status]} className="shrink-0">
                  {MILESTONE_STATUS_LABEL[m.status]}
                </Badge>
              </li>
            ))}
        </ul>
      </details>
    </div>
  )
}
