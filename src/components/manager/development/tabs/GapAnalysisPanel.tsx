/**
 * Gap Analysis tab — target selector (Job Blueprint / career match), James
 * fit-classification banner (with the development-input disclaimer), gap list,
 * and "Close this gap", which seeds a learning item and a milestone **and
 * closes the gap**.
 *
 * TDS-4a: it did not close the gap. The handler fired the two seeding calls and
 * never touched `POST /gaps/{id}/close`, so the button's own label was the one
 * thing it did not do — and because the gap stayed in the list with nothing said
 * about it, the surface read as though the click had not registered.
 *
 * The sequencing, the single error voice, and why the close runs LAST are all in
 * `useCloseGapPlan`. Two things are this file's job:
 *
 *  - **Report the outcome, not the click.** One toast, after the mutation
 *    settles, carrying the hook's sentence on failure — which always says what
 *    was written and what was not.
 *  - **Render the gap's status.** `GET /gaps` does not filter closed rows out,
 *    so a closed gap comes back in the list. Without this it would keep
 *    offering "Close this gap" on something already closed.
 *
 * S-7 prep: a failed read is NOT "no gaps". The query's error used to be
 * dropped, so a 403 rendered "No gaps identified against this target" — the one
 * sentence that is false in that case. Three states now, each said in words:
 * not shared (the dossier says so, or the read is 403), couldn't load (any other
 * failure), and none (a successful empty list).
 *
 * TDS-8 (3.2): one gap engine. When the dossier carries `gapsState` (a backend
 * that classifies gaps), the list splits into three groups, each said in words:
 *
 *  - **Measured against <role>** — rows the fit engine wrote (`engineVersion`
 *    set), with current vs benchmark levels. Shown only when `gapsState` is
 *    `ok`; every other state is a card that says why there is nothing measured
 *    ("pick a target role", "not shared", …), never an empty list.
 *  - **Indicative (coaching)** — everything the coaching step suggested,
 *    including every legacy `behavioral` row. NO level bars: those levels were
 *    never a measurement.
 *  - **Added by you** — manager/self-authored skill gaps, as before.
 *
 * In that mode the list is read unfiltered: a coaching row has no target, so
 * filtering by the selected career match would hide it. Without `gapsState`
 * (an older backend — staging-b until its promote) the tab renders exactly as
 * it did before, which is what keeps the one FE deploy inert there.
 */
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { isAxiosError } from "axios"
import { toast } from "sonner"
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
import type {
  CareerMatch,
  DevelopmentGap,
  FitClassification,
  GapSeverity,
  GapsState,
} from "@/types/development"
import { useCloseGapPlan, useGapAnalysis } from "@/hooks/manager/development"
import { classifyGap } from "@/lib/developmentGaps"
import { useDevSkin } from "../skin"

/** TDS-8: why there is nothing in the measured group, in words. */
const MEASURED_STATE_COPY: Record<Exclude<GapsState, "ok">, string> = {
  not_shared:
    "Their PRISM hasn't been shared with you, so there are no measured gaps to show. That isn't the same as having none.",
  no_account:
    "This person has no platform account, so nothing can be measured against a role.",
  no_target: "Pick a target role to see measured gaps.",
  no_prism: "There's no PRISM profile on file yet, so nothing can be measured.",
  no_fit:
    "Their target role hasn't been scored yet. Measured gaps appear once they open My fit for it.",
  unavailable: "Measured gaps couldn't be loaded right now. That isn't the same as having none.",
}

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
  const sk = useDevSkin()
  return (
    <p className={cn("flex items-start gap-1.5 rounded-md p-2.5 text-[11px]", sk.bgMuted50, sk.text500)}>
      <Info className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", sk.text400)} aria-hidden="true" />
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
  /** S-7: the dossier says the member has not shared `development` with you. */
  notShared?: boolean
  /** TDS-8: the dossier's measured-gap state. Absent → pre-TDS-8 rendering. */
  gapsState?: GapsState
  /** TDS-8: the role measured against (only when `gapsState === "ok"`). */
  gapsTargetRole?: string | null
}

export function GapAnalysisPanel({
  memberId,
  matches,
  initialTargetId,
  notShared,
  gapsState,
  gapsTargetRole,
}: GapAnalysisPanelProps) {
  const classified = gapsState !== undefined
  const sk = useDevSkin()
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

  // TDS-8: unfiltered in classified mode — a coaching row carries no target.
  const { data: gaps, isLoading, error } = useGapAnalysis(memberId, classified ? undefined : targetId)
  const forbidden = isAxiosError(error) && error.response?.status === 403
  const view: "not_shared" | "unavailable" | "loading" | "none" | "list" = notShared || forbidden
    ? "not_shared"
    : error
      ? "unavailable"
      : isLoading
        ? "loading"
        : classified
          ? "list"
          : (gaps?.length ?? 0) === 0
            ? "none"
            : "list"
  const closePlan = useCloseGapPlan(memberId)
  // Per-gap, not one shared `isPending`: the old code disabled every row's
  // button while any one of them was in flight.
  const [closingGapId, setClosingGapId] = useState<string | null>(null)

  const selectedMatch = targetOptions.find((m) => m.blueprintId === targetId)

  const handleClose = (gap: DevelopmentGap) => {
    setClosingGapId(gap.gapId)
    closePlan.mutate(
      { gap },
      {
        onSuccess: () => {
          setClosingGapId(null)
          toast.success(
            `${gap.competency} gap closed, with a learning item${gap.goalId ? " and a milestone" : ""} on the plan.`,
          )
        },
        // The hook's message always names what was written and what was not, so
        // a half-applied close cannot be reported as a success.
        onError: (err) => {
          setClosingGapId(null)
          toast.error(err.message)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={cn("text-sm", sk.text600)}>Analyze gaps against a target role.</div>
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
          <span className={cn("text-xs", sk.text400)}>No target roles available yet.</span>
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

      {view === "not_shared" ? (
        <Card className="border-dashed">
          <CardContent className={cn("p-6 text-center text-sm", sk.text500)} data-testid="gaps-not-shared">
            These development gaps haven&apos;t been shared with you. That isn&apos;t the same as having none.
          </CardContent>
        </Card>
      ) : view === "unavailable" ? (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-amber-700" role="status" data-testid="gaps-unavailable">
            Gaps couldn&apos;t be loaded right now. That isn&apos;t the same as having none.
          </CardContent>
        </Card>
      ) : view === "loading" ? (
        <div className={cn("py-10 text-center text-sm", sk.text400)}>Analyzing gaps…</div>
      ) : view === "none" ? (
        <Card className="border-dashed">
          <CardContent className={cn("p-6 text-center text-sm", sk.text500)}>
            No gaps identified against this target.
          </CardContent>
        </Card>
      ) : classified ? (
        <ClassifiedGroups
          gaps={gaps ?? []}
          gapsState={gapsState}
          gapsTargetRole={gapsTargetRole}
          renderGap={renderGap}
        />
      ) : (
        <div className="space-y-3">{gaps?.map((gap) => renderGap(gap, { levels: true }))}</div>
      )}
    </div>
  )

  function renderGap(gap: DevelopmentGap, opts: { levels: boolean; label?: string }) {
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
          {opts.levels ? (
            <div className={cn("flex items-center gap-3 text-xs", sk.text500)} data-testid="gap-levels">
              <span>Current {gap.currentLevel}</span>
              <div className={cn("h-2 flex-1 overflow-hidden rounded", sk.bgMuted100)}>
                <div className={cn("h-full rounded", sk.accentBg)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
              </div>
              <span>Target {gap.targetLevel}</span>
              <Badge variant="secondary" className="capitalize">{opts.label ?? gap.source}</Badge>
            </div>
          ) : (
            <div className={cn("text-xs", sk.text500)}>
              <Badge variant="secondary">{opts.label ?? gap.source}</Badge>
            </div>
          )}
          {gap.status === "closed" ? (
            <p className={cn("flex items-center gap-1.5 text-xs", sk.text500)}>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
              {gap.closedReason === "resolved_by_engine"
                ? "Closed: the latest fit no longer shows this gap."
                : "Closed. The learning item and milestone stay on the plan."}
            </p>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleClose(gap)}
              disabled={closingGapId === gap.gapId}
            >
              {closingGapId === gap.gapId ? "Closing…" : "Close this gap"}
            </Button>
          )}
        </CardContent>
      </Card>
    )
  }
}

type RenderGap = (gap: DevelopmentGap, opts: { levels: boolean; label?: string }) => ReactNode

/** TDS-8: the three groups. Every group says what it is; none is a bare empty list. */
function ClassifiedGroups({
  gaps,
  gapsState,
  gapsTargetRole,
  renderGap,
}: {
  gaps: DevelopmentGap[]
  gapsState?: GapsState
  gapsTargetRole?: string | null
  renderGap: RenderGap
}) {
  const sk = useDevSkin()
  // A row is filed by `engineVersion`, never by `source` — a legacy
  // `behavioral` row is indicative. `unclassified` (a row from an older
  // backend) cannot occur with `gapsState` present; it is filed as indicative,
  // the honest side.
  const measured = gaps.filter((g) => classifyGap(g) === "measured")
  const indicative = gaps.filter((g) => {
    const k = classifyGap(g)
    return k === "indicative" || k === "unclassified"
  })
  const skill = gaps.filter((g) => classifyGap(g) === "skill")
  const heading = cn("text-sm font-medium", sk.text600)

  return (
    <div className="space-y-6">
      <section className="space-y-3" aria-label="Measured gaps" data-testid="gaps-measured">
        <h3 className={heading}>
          {gapsState === "ok" && gapsTargetRole ? `Measured against ${gapsTargetRole}` : "Measured gaps"}
        </h3>
        {gapsState === "ok" ? (
          measured.length > 0 ? (
            measured.map((g) => renderGap(g, { levels: true, label: "Measured" }))
          ) : (
            <Card className="border-dashed">
              <CardContent className={cn("p-6 text-center text-sm", sk.text500)}>
                The latest fit shows no gaps against this role.
              </CardContent>
            </Card>
          )
        ) : (
          <Card className="border-dashed">
            <CardContent className={cn("p-6 text-center text-sm", sk.text500)} data-testid="gaps-measured-state">
              {MEASURED_STATE_COPY[gapsState ?? "unavailable"]}
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3" aria-label="Indicative gaps" data-testid="gaps-indicative">
        <h3 className={heading}>Indicative (coaching)</h3>
        <p className={cn("text-xs", sk.text500)}>
          Suggested from goals and coaching conversations. These are not measurements, so no levels are shown.
        </p>
        {indicative.length > 0 ? (
          indicative.map((g) => renderGap(g, { levels: false, label: "Indicative" }))
        ) : (
          <p className={cn("text-xs", sk.text400)}>No coaching suggestions yet.</p>
        )}
      </section>

      {skill.length > 0 ? (
        <section className="space-y-3" aria-label="Added gaps" data-testid="gaps-skill">
          <h3 className={heading}>Added by hand</h3>
          {skill.map((g) => renderGap(g, { levels: true, label: "Skill" }))}
        </section>
      ) : null}
    </div>
  )
}
