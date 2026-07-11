import { useMemo, useState } from "react"
import { Landmark, CalendarClock } from "lucide-react"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { useDeadlines } from "@/hooks/grant/useDeadlines"
import type { Deadline, DeadlineStatus, DeadlineType } from "@/types/grant"
import { GrantPageHeader, GrantCard, GrantEmptyState, GrantPill } from "./_shared"
import { formatDate, relativeDeadline, daysUntil } from "./_format"

const TYPE_LABELS: Record<DeadlineType, string> = {
  federal: "Federal",
  state: "State",
  institutional: "Institutional",
  scholarship: "Scholarship",
}

const STATUS_TONE: Record<DeadlineStatus, "amber" | "red" | "blue" | "green"> = {
  "due-soon": "amber",
  overdue: "red",
  upcoming: "blue",
  submitted: "green",
}

const STATUS_LABEL: Record<DeadlineStatus, string> = {
  "due-soon": "Due soon",
  overdue: "Overdue",
  upcoming: "Upcoming",
  submitted: "Submitted",
}

type Filter = "all" | DeadlineType

/**
 * UI-3 — Federal & State Aid.
 *
 * A chronological deadline tracker for FAFSA, Pell, and state/institutional aid.
 * Filter chips narrow by aid type; each row shows days-until and a status pill.
 * Backed by `useDeadlines` (mock for UI-0 → GET /v1/deadlines when live).
 */
export default function GrantFederalPage() {
  const { data, isLoading } = useDeadlines()
  const [filter, setFilter] = useState<Filter>("all")

  const sorted = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ),
    [data]
  )

  const filtered = useMemo(
    () => (filter === "all" ? sorted : sorted.filter((d) => d.type === filter)),
    [sorted, filter]
  )

  const types = useMemo(() => {
    const present = new Set(sorted.map((d) => d.type))
    return (["all", "federal", "state", "institutional", "scholarship"] as Filter[]).filter(
      (t) => t === "all" || present.has(t as DeadlineType)
    )
  }, [sorted])

  return (
    <div className="max-w-3xl">
      <GrantPageHeader
        icon={Landmark}
        title="Federal & State Aid"
        description="FAFSA, Pell Grants, and state aid deadlines ordered by what's due next."
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {types.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setFilter(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition",
              filter === t
                ? "border-[#3B5BFF] bg-[rgba(59,91,255,0.08)] text-[#3B5BFF]"
                : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#cbd5e1]"
            )}
          >
            {t === "all" ? "All" : TYPE_LABELS[t as DeadlineType]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <GrantEmptyState>No deadlines in this category.</GrantEmptyState>
      ) : (
        <ol className="space-y-3">
          {filtered.map((d: Deadline) => {
            const overdue = daysUntil(d.dueDate) < 0 && d.status !== "submitted"
            return (
              <li key={d.id}>
                <GrantCard className="flex items-center justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(59,91,255,0.08)]">
                      <CalendarClock className="h-4 w-4 text-[#3B5BFF]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-semibold text-[#1f2937]">{d.name}</h2>
                        <GrantPill tone="gray">{TYPE_LABELS[d.type]}</GrantPill>
                      </div>
                      <p className="mt-0.5 text-xs text-[#9ca3af]">
                        {formatDate(d.dueDate)}
                        {d.institution ? ` · ${d.institution}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <GrantPill tone={STATUS_TONE[d.status]}>{STATUS_LABEL[d.status]}</GrantPill>
                    <span
                      className={cn(
                        "text-xs",
                        overdue ? "font-medium text-[#b91c1c]" : "text-[#6b7280]"
                      )}
                    >
                      {relativeDeadline(d.dueDate)}
                    </span>
                  </div>
                </GrantCard>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
