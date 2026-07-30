import { useState } from "react"
import { Link } from "react-router-dom"
import { Target, ChevronRight, Building2, TrendingUp } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import type { FitMatch, FitMethod } from "@/types/job-fit"
import {
  FitPageHeader,
  FitCard,
  FitPill,
  FitEmptyState,
  FitLoading,
  FitError,
} from "./_shared"
import { MatchingValidationBanner } from "@/components/job-fit/MatchingValidationBanner"
import FitPurpose from "./FitPurpose"
import {
  bandTone,
  bandLabel,
  tierLabel,
  variationDescriptor,
  fitPercent,
  fitPercentTone,
} from "./_fit"

const PCT_COLOR: Record<string, string> = {
  green: "text-[#15803d]",
  teal: "text-[#0f766e]",
  amber: "text-[#b45309]",
  red: "text-[#b91c1c]",
  gray: "text-[#6b7280]",
}

/** One ranked role match, linking through to its fit detail. */
function MatchRow({ match }: { match: FitMatch }) {
  // Show an explicit 1-100 fit % on the row so the person sees their fit here on
  // "My Fit" without opening the detail page. Uses the weighted-closeness score
  // directly under that method; otherwise derives the same % the detail shows.
  const pct =
    match.method === "closeness" && match.closenessScore != null
      ? Math.max(1, Math.min(100, Math.round(match.closenessScore)))
      : fitPercent(undefined, match.totalVariation, 22)
  const pctColor = PCT_COLOR[fitPercentTone(pct)] ?? PCT_COLOR.teal
  return (
    <Link
      to={ROUTES.JOB_FIT.detail(match.jobId)}
      className="group flex items-center gap-4 rounded-xl border border-[#e5e7eb] bg-white p-4 transition-colors hover:border-[#0D9488]"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="truncate text-base font-semibold text-[#1f2937]">{match.roleTitle}</span>
          <FitPill tone={bandTone(match.fitBand)}>{bandLabel(match.fitBand)} fit</FitPill>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
          {match.department && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {match.department}
            </span>
          )}
          <span>{tierLabel(match.tier)} role</span>
          <span className="inline-flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5" />
            {variationDescriptor(match.totalVariation)}
          </span>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className={`text-2xl font-bold leading-none ${pctColor}`}>
          {pct}
          <span className="text-sm font-semibold text-[#9ca3af]">%</span>
        </div>
        <div className="mt-0.5 text-[10px] uppercase tracking-wide text-[#9ca3af]">fit</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-[#9ca3af] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0D9488]" />
    </Link>
  )
}

/**
 * Job-Fit home — the user's own PRISM profile ranked against every published
 * Job DNA, best-first. Each row links to a full per-role breakdown.
 */
const METHOD_OPTIONS: { value: FitMethod; label: string; hint: string }[] = [
  { value: "gap", label: "Gap to benchmark", hint: "Distance from the role's target profile" },
  { value: "closeness", label: "Overall closeness", hint: "Weighted similarity to the role" },
]

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
  const { data, isLoading, isError } = useFitMatches(method)

  return (
    <div className="mx-auto max-w-4xl">
      <FitPageHeader
        icon={Target}
        title="Your Role Matches"
        description="How your behavioral profile lines up with open roles — ranked from closest match."
      />

      <FitPurpose />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <MatchingValidationBanner />
        <MethodToggle method={method} onChange={setMethod} />
      </div>

      {isLoading && <FitLoading label="Matching your profile to open roles…" />}

      {isError && (
        <FitError>
          We couldn&apos;t load your matches right now. Please try again in a moment.
        </FitError>
      )}

      {!isLoading && !isError && (data?.length ?? 0) === 0 && (
        <FitEmptyState>
          No published roles are available to match against yet. Check back once your organization
          publishes role benchmarks.
        </FitEmptyState>
      )}

      {!isLoading && !isError && (data?.length ?? 0) > 0 && (
        <FitCard className="space-y-3 p-4">
          {data!.map((m) => (
            <MatchRow key={m.jobId} match={m} />
          ))}
        </FitCard>
      )}
    </div>
  )
}
