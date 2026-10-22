import { useMemo, useState } from "react"
import { Target } from "lucide-react"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import type { FitMethod } from "@/types/job-fit"
import {
  FitPageHeader,
  FitEmptyState,
  FitLoading,
  FitError,
  PartialProfileNote,
} from "@/components/fit/primitives"
import { partialCoverage } from "@/lib/job-fit/coverage"
import FitPurpose from "./FitPurpose"
import { FitHistoryPanel } from "./FitHistoryPanel"
import { displayFitPercent } from "@/components/fit/fit"
import { FitMatchList } from "@/components/fit/FitMatchList"
import { useJobFitComponentsEnabled } from "@/hooks/switches/useJobFitComponentsEnabled"
import { useFitComponents } from "@/hooks/job-fit/useFitComponents"
import {
  goalSortRank,
  orderRows,
  readOrder,
  writeOrder,
  type ListOrder,
} from "@/components/fit/components"

/**
 * Job-Fit home — the user's own PRISM profile ranked against every published
 * Job DNA, best-first. Each row links to a full per-role breakdown.
 */
// FIT-3 (owner, Q2): "Overall" means the Overall fit only, so the D4 method
// that is a PRISM formula says so.
const METHOD_OPTIONS: { value: FitMethod; label: string; hint: string }[] = [
  { value: "gap", label: "Gap to benchmark", hint: "Distance from the role's target profile" },
  { value: "closeness", label: "PRISM closeness", hint: "Weighted similarity to the role" },
]

function OrderToggle({ order, onChange }: { order: ListOrder; onChange: (o: ListOrder) => void }) {
  const options: { value: ListOrder; label: string }[] = [
    { value: "overall", label: "Overall fit" },
    { value: "prism", label: "PRISM fit" },
  ]
  return (
    <div className="inline-flex items-center gap-2 text-xs text-[#374151]">
      <span>Order by:</span>
      <div
        role="radiogroup"
        aria-label="Order by"
        className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-0.5"
      >
        {options.map((opt) => {
          const active = order === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "bg-white text-[#0D9488] shadow-sm"
                  : "text-[#6b7280] hover:text-[#374151]")
              }
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Decision D4 — let the user choose which scoring formula ranks their matches. */
function MethodToggle({
  method,
  onChange,
}: {
  method: FitMethod
  onChange: (m: FitMethod) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Scoring method"
      className="inline-flex rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-0.5"
    >
      {METHOD_OPTIONS.map((opt) => {
        const active = method === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
              (active
                ? "bg-white text-[#0D9488] shadow-sm"
                : "text-[#6b7280] hover:text-[#374151]")
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export default function MatchesPage() {
  const [method, setMethod] = useState<FitMethod>("gap")
  const { data, isLoading, isError, gated } = useFitMatches(method)
  // Feeds Phase 2 — dark unless the server switch is on: no request, no chip,
  // no sort control, today's list exactly.
  const componentsOn = useJobFitComponentsEnabled()
  const [byGoals, setByGoals] = useState(false)
  const jobs = useMemo(
    () => (data ?? []).map((m) => ({ jobId: m.jobId, fitScore: displayFitPercent(m) })),
    [data],
  )
  const components = useFitComponents(jobs, componentsOn)
  // FIT-3: Overall fit is on exactly when the server answered in that shape.
  const overallOn = components.data?.mode === "overall"
  const [order, setOrderState] = useState<ListOrder>(readOrder)
  const setOrder = (o: ListOrder) => {
    setOrderState(o)
    writeOrder(o)
  }
  const rows = useMemo(() => {
    const list = overallOn ? orderRows(data ?? [], components.data?.jobs, order) : (data ?? [])
    if (!byGoals || !components.data) return list
    const jobsC = components.data.jobs
    // Stable: ties keep the fit order the list arrived in.
    return list
      .map((m, i) => ({ m, i }))
      .sort((a, b) => {
        const ca = jobsC[a.m.jobId]
        const cb = jobsC[b.m.jobId]
        const ra = goalSortRank(ca?.status === "ok" ? ca.goalAlignment : undefined)
        const rb = goalSortRank(cb?.status === "ok" ? cb.goalAlignment : undefined)
        return ra - rb || a.i - b.i
      })
      .map(({ m }) => m)
  }, [data, byGoals, components.data, overallOn, order])

  return (
    <div className="mx-auto max-w-4xl">
      <FitPageHeader
        icon={Target}
        title="Your Role Matches"
        description="How your behavioral profile lines up with open roles — ranked from closest match."
      />

      <FitPurpose />

      <div className="mb-5 flex flex-wrap items-center justify-end gap-3">
        {componentsOn && (
          <label className="inline-flex items-center gap-2 text-xs text-[#374151]">
            <input
              type="checkbox"
              checked={byGoals}
              onChange={(e) => setByGoals(e.target.checked)}
              disabled={components.isError}
            />
            Sort by my goals
          </label>
        )}
        {overallOn && <OrderToggle order={order} onChange={setOrder} />}
        <MethodToggle method={method} onChange={setMethod} />
      </div>

      {componentsOn && components.isError && (
        <p role="alert" className="mb-3 text-xs text-[#6b7280]">
          Couldn&apos;t read your goals — sorted by fit.
        </p>
      )}

      <FitMatchList
        variant="career"
        matches={rows}
        components={components.data?.jobs}
        state={{ isLoading, isError, gated, gatedHidesRows: false }}
        slots={{
          loading: <FitLoading label="Matching your profile to open roles…" />,
          error: (
            <FitError>
              We couldn&apos;t load your matches right now. Please try again in a moment.
            </FitError>
          ),
          // FIT-1: matching switched off platform-side is not "no roles".
          gated: (
            <FitEmptyState>
              Role matching is paused for now. It&apos;s a deliberate hold, not a problem with your
              profile — your matches will appear here once it&apos;s switched back on.
            </FitEmptyState>
          ),
          gatedNote: (
            <p role="note" className="mb-3 text-xs text-[#6b7280]">
              Role matching is still in limited release, so treat these as a first draft rather than a
              settled read.
            </p>
          ),
          empty: (
            <FitEmptyState>
              No published roles are available to match against yet. Check back once your organization
              publishes role benchmarks.
            </FitEmptyState>
          ),
          // BP-F5: one explanation for the page, from the first partial row.
          beforeList: <PartialProfileNote coverage={(data ?? []).find((m) => partialCoverage(m))} />,
        }}
      />

      {/* JS-3 — every fit read and every save, from the server */}
      <FitHistoryPanel />
    </div>
  )
}
