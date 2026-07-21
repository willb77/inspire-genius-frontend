/**
 * Gap Analysis tab — target selector (Job Blueprint / career match), James
 * fit-classification banner (with the development-input disclaimer), gap list,
 * and "Close this gap" which seeds a learning item + milestone.
 */
import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Info, Target } from "lucide-react"
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
  DEVELOPMENT_INPUT_DISCLAIMER,
  FIT_CLASSIFICATION_LABEL,
  GAP_SEVERITY_LABEL,
} from "@/constants/development"
import type { CareerMatch, DevelopmentGap, FitClassification, GapSeverity } from "@/types/development"
import {
  useGapAnalysis,
  useLearningPlan,
  useCreateMilestone,
} from "@/hooks/manager/development"

const SEVERITY_META: Record<GapSeverity, { className: string; icon: typeof AlertTriangle }> = {
  critical: { className: "text-red-600", icon: AlertTriangle },
  moderate: { className: "text-amber-600", icon: AlertTriangle },
  minor: { className: "text-slate-500", icon: Info },
}

const FIT_BANNER: Record<FitClassification, { className: string; icon: typeof CheckCircle2 }> = {
  strong_fit: { className: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: CheckCircle2 },
  potential_fit: { className: "bg-amber-50 text-amber-800 border-amber-200", icon: Target },
  misalignment: { className: "bg-red-50 text-red-800 border-red-200", icon: AlertTriangle },
}

function DisclaimerNote() {
  return (
    <p className="flex items-start gap-1.5 rounded-md bg-slate-50 p-2.5 text-[11px] text-slate-500">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
      <span>{DEVELOPMENT_INPUT_DISCLAIMER}</span>
    </p>
  )
}

export type GapAnalysisPanelProps = {
  memberId: string
  /** Career matches supply the target-role options + fit classification. */
  matches: CareerMatch[]
  /** Pre-select a target blueprint (e.g. "Set as target" from Career Matches). */
  initialTargetId?: string
}

export function GapAnalysisPanel({ memberId, matches, initialTargetId }: GapAnalysisPanelProps) {
  const targetOptions = useMemo(
    () => matches.filter((m) => m.blueprintId),
    [matches],
  )
  const [targetId, setTargetId] = useState<string | undefined>(
    initialTargetId ?? targetOptions[0]?.blueprintId,
  )

  useEffect(() => {
    if (initialTargetId) setTargetId(initialTargetId)
  }, [initialTargetId])

  const { data: gaps, isLoading } = useGapAnalysis(memberId, targetId)
  const learning = useLearningPlan(memberId)
  const milestone = useCreateMilestone(memberId)

  const selectedMatch = targetOptions.find((m) => m.blueprintId === targetId)

  const handleClose = (gap: DevelopmentGap) => {
    learning.mutate({
      gapId: gap.gapId,
      goalId: gap.goalId,
      title: `Close gap: ${gap.competency}`,
    })
    if (gap.goalId) {
      milestone.mutate({
        goalId: gap.goalId,
        title: `Close ${gap.competency} gap`,
        horizon: "d90",
        gapIds: [gap.gapId],
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-slate-600">Analyze gaps against a target role.</div>
        {targetOptions.length > 0 ? (
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-[240px]" aria-label="Target role">
              <SelectValue placeholder="Select a target role" />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((m) => (
                <SelectItem key={m.blueprintId} value={m.blueprintId as string}>
                  {m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-slate-400">No target roles available yet.</span>
        )}
      </div>

      {/* James fit banner */}
      {selectedMatch ? (
        <div className={cn("flex items-start gap-2 rounded-lg border p-3 text-sm", FIT_BANNER[selectedMatch.classification].className)}>
          {(() => {
            const Icon = FIT_BANNER[selectedMatch.classification].icon
            return <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          })()}
          <div>
            <div className="font-medium">
              James assessment: {FIT_CLASSIFICATION_LABEL[selectedMatch.classification]} for {selectedMatch.title}
            </div>
            <p className="mt-0.5 text-xs opacity-90">{selectedMatch.rationale}</p>
          </div>
        </div>
      ) : null}

      <DisclaimerNote />

      {isLoading ? (
        <div className="py-10 text-center text-sm text-slate-400">Analyzing gaps…</div>
      ) : (gaps?.length ?? 0) === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-slate-500">
            No gaps identified against this target.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {gaps?.map((gap) => {
            const meta = SEVERITY_META[gap.severity]
            const Icon = meta.icon
            const pct = gap.targetLevel > 0 ? (gap.currentLevel / gap.targetLevel) * 100 : 0
            return (
              <Card key={gap.gapId}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm">{gap.competency}</CardTitle>
                    <Badge variant="outline" className={cn("gap-1", meta.className)}>
                      <Icon className="h-3 w-3" aria-hidden="true" />
                      {GAP_SEVERITY_LABEL[gap.severity]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>Current {gap.currentLevel}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100">
                      <div className="h-full rounded bg-[#3B5BFF]" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
                    </div>
                    <span>Target {gap.targetLevel}</span>
                    <Badge variant="secondary" className="capitalize">{gap.source}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleClose(gap)}
                    disabled={learning.isPending}
                  >
                    Close this gap
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
