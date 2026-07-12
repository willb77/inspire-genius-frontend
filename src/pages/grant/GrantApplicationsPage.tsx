import { useMemo, useState } from "react"
import { ClipboardList, Circle, CheckCircle2, Lock, ShieldAlert, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import { GrantPageHeader, GrantCard, GrantPill, GrantMeter } from "./_shared"
import { formatDate, relativeDeadline } from "./_format"

type PillTone = "blue" | "teal" | "amber" | "red" | "gray" | "green"

/** Concierge processing status for a checklist item. */
type ConciergeStatus = "submitted" | "ready" | "review"

const STATUS_META: Record<ConciergeStatus, { label: string; tone: PillTone }> = {
  submitted: { label: "Submitted", tone: "green" },
  ready: { label: "Ready", tone: "teal" },
  review: { label: "Needs review", tone: "amber" },
}

type Task = {
  id: string
  label: string
  /** Short name for the recommended-order strip (never the full "Submit …" label). */
  chipLabel: string
  detail?: string
  /** Pre-completed when the underlying deadline is already submitted. */
  done: boolean
  /** Auto-fill completeness, 0–100. */
  autoFill: number
  status: ConciergeStatus
  /** Item requires sensitive data (SSN, tax records). */
  pii: boolean
  /** A human must review before submit. */
  humanReview: boolean
}

/** Standard FAFSA-prep steps everyone works through, independent of deadlines. */
const PREP_STEPS: Task[] = [
  {
    id: "prep-fsa-id",
    label: "Create your FSA ID",
    chipLabel: "Create your FSA ID",
    detail: "Needed to sign the FAFSA electronically.",
    done: false,
    autoFill: 35,
    status: "review",
    pii: true,
    humanReview: true,
  },
  {
    id: "prep-tax",
    label: "Gather tax & income documents",
    chipLabel: "Tax & income documents",
    detail: "Prior-prior year returns, W-2s, bank statements.",
    done: false,
    autoFill: 60,
    status: "review",
    pii: true,
    humanReview: true,
  },
  {
    id: "prep-schools",
    label: "List your schools on the FAFSA",
    chipLabel: "List your schools",
    detail: "Add every school you're considering.",
    done: false,
    autoFill: 100,
    status: "ready",
    pii: false,
    humanReview: false,
  },
]

/**
 * UI-7 — Application Concierge.
 *
 * A guided, checkable task list that turns the student's live deadlines into
 * concrete application steps alongside standard FAFSA prep. Each item surfaces an
 * auto-fill percentage, a processing status, a PII flag where sensitive data is
 * involved, and a human-review note — the concierge drafts, the student approves.
 * Progress persists in component state for the session; submitted deadlines start
 * checked off. Backed by `useDeadlines` (mock for UI-0 → GET /v1/deadlines).
 */
export default function GrantApplicationsPage() {
  const { data, isLoading } = useDeadlines()
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const tasks: Task[] = useMemo(() => {
    const fromDeadlines: Task[] = [...(data ?? [])]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map((d) => {
        const done = d.status === "submitted"
        const needsPii = d.type === "federal" || d.type === "institutional"
        const status: ConciergeStatus = done ? "submitted" : d.status === "due-soon" ? "ready" : "review"
        return {
          id: `dl-${d.id}`,
          label: `Submit ${d.name}`,
          chipLabel: d.name,
          detail: `${formatDate(d.dueDate)} · ${relativeDeadline(d.dueDate)}`,
          done,
          autoFill: done ? 100 : d.status === "due-soon" ? 92 : 85,
          status,
          pii: needsPii,
          humanReview: !done,
        }
      })
    return [...PREP_STEPS, ...fromDeadlines]
  }, [data])

  const isDone = (t: Task) => checked[t.id] ?? t.done
  const completed = tasks.filter(isDone).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const nextUp = tasks.find((t) => !isDone(t))
  const recommended = tasks.filter((t) => !isDone(t)).slice(0, 4)

  function toggle(t: Task) {
    setChecked((prev) => ({ ...prev, [t.id]: !isDone(t) }))
  }

  return (
    <div className="max-w-3xl">
      <GrantPageHeader
        icon={ClipboardList}
        title="Application Concierge"
        description="A guided checklist that turns your deadlines into concrete next steps."
      />

      {isLoading ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <>
          <GrantCard className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-[#374151]">
                {completed} of {total} steps complete
              </span>
              <GrantPill tone={pct === 100 ? "green" : "blue"}>{pct}%</GrantPill>
            </div>
            <Progress value={pct} className="h-2" />
            {nextUp ? (
              <p className="mt-3 text-sm text-[#6b7280]">
                Next up: <span className="font-medium text-[#1f2937]">{nextUp.label}</span>
              </p>
            ) : (
              <p className="mt-3 text-sm font-medium text-[#15803d]">
                All steps complete — nice work.
              </p>
            )}
          </GrantCard>

          {recommended.length > 0 && (
            <GrantCard className="mb-5">
              <div className="mb-1 flex items-center gap-2">
                <ListOrdered className="h-4 w-4 text-[#3B5BFF]" />
                <span className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">
                  GRANT's recommended order
                </span>
              </div>
              <p className="mb-3 text-xs text-[#9ca3af]">
                Do these first — soonest deadline &times; highest value.
              </p>
              <div className="flex flex-wrap gap-2">
                {recommended.map((t, i) => (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-[#f9fafb] py-1 pl-1.5 pr-3 text-xs font-medium text-[#374151]"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#3B5BFF] text-[10px] font-bold text-white">
                      {i + 1}
                    </span>
                    {t.chipLabel}
                  </span>
                ))}
              </div>
            </GrantCard>
          )}

          <ul className="space-y-2">
            {tasks.map((t) => {
              const done = isDone(t)
              const statusKey: ConciergeStatus = done ? "submitted" : t.status
              const status = STATUS_META[statusKey]
              const fillPct = done ? 100 : t.autoFill
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => toggle(t)}
                    aria-pressed={done}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition",
                      done
                        ? "border-[#e5e7eb] bg-[#f9fafb]"
                        : "border-[#e5e7eb] bg-white hover:border-[#cbd5e1]"
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#2DD4BF]" />
                    ) : (
                      <Circle className="mt-0.5 h-5 w-5 shrink-0 text-[#cbd5e1]" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            done ? "text-[#9ca3af] line-through" : "text-[#1f2937]"
                          )}
                        >
                          {t.label}
                        </span>
                        <GrantPill tone={status.tone}>{status.label}</GrantPill>
                        {t.pii && (
                          <GrantPill tone="amber">
                            <Lock className="mr-1 h-3 w-3" />
                            PII
                          </GrantPill>
                        )}
                      </div>
                      {t.detail && <span className="mt-0.5 block text-xs text-[#9ca3af]">{t.detail}</span>}
                      <GrantMeter
                        className="mt-2.5"
                        value={fillPct}
                        tone={done ? "green" : "blue"}
                        label="Auto-filled"
                        right={`${fillPct}%`}
                      />
                      {!done && t.humanReview && (
                        <span className="mt-2 flex items-center gap-1.5 text-xs text-[#b45309]">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          Human review required before submit
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
