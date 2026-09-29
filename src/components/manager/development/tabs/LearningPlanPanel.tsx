/**
 * Learning & Training tab — items grouped by gap/goal, with provider, est
 * hours, format, status/progress/quiz, controls that PERSIST progress, a link
 * through to the manager training surface, and a behavioral pacing note.
 *
 * TDS-4a. Two things were wrong on this tab:
 *
 *  - **Progress was read-only.** `<Progress value={item.progress}>` rendered a
 *    number nothing on this surface could write. There is now a save, against
 *    `PATCH /members/{id}/learning-items/{itemId}`.
 *  - **"Assign" did not assign.** It navigated to the Training surface and
 *    nothing else — which it still does, because that is where assignment
 *    happens. The label now says where it goes instead of naming an action the
 *    click never performed. (It never falsely toasted, so nothing was being
 *    reported as done; the word was simply borrowed.)
 *
 * Every save is awaited and its outcome toasted, success or failure, with the
 * server's own sentence via `apiErrorMessage` — a PATCH that 422s sends `detail`
 * as an ARRAY, and handing that to sonner renders an object as a React child.
 */
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { BookOpen, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { apiErrorMessage } from "@/lib/apiErrorMessage"
import { ROUTES } from "@/constants/routes"
import { LEARNING_STATUS_LABEL } from "@/constants/development"
import type { DevelopmentGap, LearningItem, SummitGoal } from "@/types/development"
import type { UpdateLearningItemInput } from "@/services/manager/development/growthService"
import { useUpdateLearningItem } from "@/hooks/manager/development"
import { useDevSkin } from "../skin"

/** 0..100, integer. Anything else is not a percentage the server will take.
 *  Module-private on purpose: a second value export here would trip
 *  `react-refresh/only-export-components`. Covered through the form. */
function clampPercent(value: string): number | null {
  // An EMPTY box is not 0%. `Number("")` is 0, so without this an empty field
  // would silently save "not started" over whatever the server had — and a
  // <input type="number"> blanks itself when the text is not a number, so
  // typing rubbish lands here as "".
  if (value.trim() === "") return null
  const n = Number(value)
  // Not reachable from the control above — a <input type="number"> blanks
  // anything it cannot represent, so rubbish arrives as "" and is caught by the
  // line before this one. Kept anyway, and deliberately NOT given a test that
  // would pass through the empty path while claiming to exercise this: the day
  // someone makes that input type="text", `Math.round(NaN)` would send
  // `progress: NaN`, which serialises to null and blanks the number on the
  // server. This line is the one uncovered line in the file, on purpose.
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.min(100, Math.round(n)))
}

function LearningItemRow({
  item,
  onAssign,
  onSave,
  saving,
}: {
  item: LearningItem
  onAssign: () => void
  onSave: (itemId: string, input: UpdateLearningItemInput) => void
  saving: boolean
}) {
  const sk = useDevSkin()
  const [percent, setPercent] = useState(String(item.progress ?? 0))
  return (
    <div className={cn("flex flex-col gap-2 rounded-lg border p-3", sk.border100)}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className={cn("flex items-center gap-1.5 text-sm font-medium", sk.text800)}>
            <BookOpen className={cn("h-3.5 w-3.5 shrink-0", sk.text400)} aria-hidden="true" />
            <span className="truncate">{item.title}</span>
          </div>
          <div className={cn("mt-0.5 flex flex-wrap items-center gap-2 text-xs", sk.text500)}>
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        {typeof item.quizScore === "number" ? (
          <span className={cn("text-xs", sk.text500)}>Quiz: {item.quizScore}%</span>
        ) : (
          <span />
        )}
        <Button size="sm" variant="outline" onClick={onAssign}>
          Assign in Training
        </Button>
      </div>
      {/* The write. Progress is saved on its own so it does not blank anything
          else; the server writes only the fields it receives. */}
      <form
        className="flex flex-wrap items-center gap-2"
        aria-label={`Save progress on ${item.title}`}
        // `noValidate` on purpose. `min`/`max` bound the spinner, but native
        // constraint validation BLOCKS submit for an out-of-range value, which
        // would make the clamp below unreachable and leave the manager with a
        // browser bubble and no saved number. Clamping in code instead writes
        // the corrected value back into the box, so what was saved is what is
        // on screen.
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          const value = clampPercent(percent)
          if (value === null) return
          setPercent(String(value))
          onSave(item.itemId, { progress: value })
        }}
      >
        <input
          type="number"
          min={0}
          max={100}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          aria-label={`Percent complete for ${item.title}`}
          className={cn("w-20 rounded-md border px-2 py-1 text-xs", sk.border200, sk.text700)}
        />
        <Button type="submit" size="sm" variant="ghost" disabled={saving}>
          {saving ? "Saving…" : "Save progress"}
        </Button>
        {item.status === "complete" ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => onSave(item.itemId, { status: "in_progress" })}
          >
            Reopen
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={saving}
            onClick={() => onSave(item.itemId, { status: "complete", progress: 100 })}
          >
            Mark complete
          </Button>
        )}
      </form>
    </div>
  )
}

export type LearningPlanPanelProps = {
  /** Needed to write: progress is saved per member, per item. */
  memberId: string
  learning: LearningItem[]
  gaps: DevelopmentGap[]
  goals: SummitGoal[]
}

export function LearningPlanPanel({ memberId, learning, gaps, goals }: LearningPlanPanelProps) {
  const sk = useDevSkin()
  const navigate = useNavigate()
  const update = useUpdateLearningItem(memberId)
  const [savingItemId, setSavingItemId] = useState<string | null>(null)

  const save = (itemId: string, input: UpdateLearningItemInput) => {
    setSavingItemId(itemId)
    update.mutate(
      { itemId, input },
      {
        onSuccess: (saved) => {
          setSavingItemId(null)
          toast.success(
            typeof saved.progress === "number"
              ? `Saved — ${saved.progress}% complete.`
              : "Saved.",
          )
        },
        onError: (err) => {
          setSavingItemId(null)
          toast.error(apiErrorMessage(err, "That didn't save. The item is unchanged."))
        },
      },
    )
  }

  if (learning.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className={cn("p-6 text-center text-sm", sk.text500)}>
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
      <p className={cn("rounded-md p-2.5 text-xs", sk.bgMuted50, sk.text500)}>
        Pacing note: items are sequenced to match this member’s behavioral learning preference —
        avoid front-loading; space experiential items between reflective ones.
      </p>
      {Array.from(groups.entries()).map(([group, items]) => (
        <div key={group} className="space-y-2">
          <h3 className={cn("text-xs font-semibold uppercase tracking-wide", sk.text500)}>{group}</h3>
          <div className="space-y-2">
            {items.map((item) => (
              <LearningItemRow
                key={item.itemId}
                item={item}
                onAssign={assign}
                onSave={save}
                saving={savingItemId === item.itemId}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
