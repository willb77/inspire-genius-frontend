import { useMemo, useState } from "react"
import { ClipboardList, Circle, CheckCircle2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import { GrantPageHeader, GrantCard, GrantPill } from "./_shared"
import { formatDate, relativeDeadline } from "./_format"

type Task = {
  id: string
  label: string
  detail?: string
  /** Pre-completed when the underlying deadline is already submitted. */
  done: boolean
}

/** Standard FAFSA-prep steps everyone works through, independent of deadlines. */
const PREP_STEPS: Task[] = [
  { id: "prep-fsa-id", label: "Create your FSA ID", detail: "Needed to sign the FAFSA electronically.", done: false },
  { id: "prep-tax", label: "Gather tax & income documents", detail: "Prior-prior year returns, W-2s, bank statements.", done: false },
  { id: "prep-schools", label: "List your schools on the FAFSA", detail: "Add every school you're considering.", done: false },
]

/**
 * UI-7 — Application Concierge.
 *
 * A guided, checkable task list that turns the student's live deadlines into
 * concrete application steps alongside standard FAFSA prep. Progress persists in
 * component state for the session; submitted deadlines start checked off.
 * Backed by `useDeadlines` (mock for UI-0 → GET /v1/deadlines when live).
 */
export default function GrantApplicationsPage() {
  const { data, isLoading } = useDeadlines()
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const tasks: Task[] = useMemo(() => {
    const fromDeadlines: Task[] = [...(data ?? [])]
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      .map((d) => ({
        id: `dl-${d.id}`,
        label: `Submit ${d.name}`,
        detail: `${formatDate(d.dueDate)} · ${relativeDeadline(d.dueDate)}`,
        done: d.status === "submitted",
      }))
    return [...PREP_STEPS, ...fromDeadlines]
  }, [data])

  const isDone = (t: Task) => checked[t.id] ?? t.done
  const completed = tasks.filter(isDone).length
  const total = tasks.length
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const nextUp = tasks.find((t) => !isDone(t))

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

          <ul className="space-y-2">
            {tasks.map((t) => {
              const done = isDone(t)
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
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-medium",
                          done ? "text-[#9ca3af] line-through" : "text-[#1f2937]"
                        )}
                      >
                        {t.label}
                      </span>
                      {t.detail && <span className="block text-xs text-[#9ca3af]">{t.detail}</span>}
                    </span>
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
