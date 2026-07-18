import { Link } from "react-router-dom"
import { Target, ChevronRight, Building2, TrendingUp } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import type { FitMatch } from "@/types/job-fit"
import {
  FitPageHeader,
  FitCard,
  FitPill,
  FitEmptyState,
  FitLoading,
  FitError,
  FitMethodologyNote,
} from "./_shared"
import { bandTone, bandLabel, tierLabel, variationDescriptor } from "./_fit"

/** One ranked role match, linking through to its fit detail. */
function MatchRow({ match }: { match: FitMatch }) {
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
      <ChevronRight className="h-5 w-5 shrink-0 text-[#9ca3af] transition-transform group-hover:translate-x-0.5 group-hover:text-[#0D9488]" />
    </Link>
  )
}

/**
 * Job-Fit home — the user's own PRISM profile ranked against every published
 * Job DNA, best-first. Each row links to a full per-role breakdown.
 */
export default function MatchesPage() {
  const { data, isLoading, isError } = useFitMatches()

  return (
    <div className="mx-auto max-w-4xl">
      <FitPageHeader
        icon={Target}
        title="Your Role Matches"
        description="How your behavioral profile lines up with open roles — ranked from closest match."
      />

      <div className="mb-5">
        <FitMethodologyNote />
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
