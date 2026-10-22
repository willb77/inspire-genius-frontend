import { useMemo } from "react"
import { Link } from "react-router-dom"
import { Layers, ChevronRight } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import {
  FitPageHeader,
  FitCard,
  FitStat,
  FitMeter,
  FitSectionTitle,
  FitEmptyState,
  FitLoading,
  FitError,
} from "@/components/fit/primitives"
import { aggregateDomains, hasFullDomainSplit, meterTone, perDimensionMean } from "./_gaps"

/**
 * Aggregate view of where the user's profile diverges from role benchmarks,
 * summarised across all matched roles. Derived entirely from the ranked matches
 * list so it stays a single query — a bird's-eye complement to per-role detail.
 */
export default function GapsPage() {
  const { data, isLoading, isError, error } = useFitMatches()

  const matches = useMemo(() => data ?? [], [data])
  const domains = useMemo(() => aggregateDomains(matches), [matches])
  const splitCount = useMemo(() => matches.filter(hasFullDomainSplit).length, [matches])
  // Ranked by the per-dimension mean, not the raw total: a role read on fewer
  // dimensions has a smaller total without being any closer.
  const widestRoles = useMemo(
    () =>
      matches
        .map((m) => ({ m, mean: perDimensionMean(m) }))
        .sort((a, b) => b.mean - a.mean || b.m.totalVariation - a.m.totalVariation)
        .slice(0, 5),
    [matches]
  )
  const topDomain = useMemo(
    () => (domains.length ? [...domains].sort((a, b) => b.avg - a.avg)[0] : null),
    [domains]
  )

  return (
    <div className="mx-auto max-w-4xl">
      <FitPageHeader
        icon={Layers}
        title="Your Gaps at a Glance"
        description="Where your profile tends to diverge from role benchmarks, summarised across every match."
      />

      {isLoading && <FitLoading label="Aggregating gaps across your matches…" />}

      {isError && (
        <FitError>
          <span role="alert">
            We couldn&apos;t load your gap summary right now.
            {error?.message ? ` (${error.message})` : ""}
          </span>
        </FitError>
      )}

      {!isLoading && !isError && matches.length === 0 && (
        <FitEmptyState>
          No matched roles yet, so there are no gaps to summarise. Your gap picture appears once roles
          are available to match against.
        </FitEmptyState>
      )}

      {!isLoading && !isError && matches.length > 0 && (
        <>
          {domains.length > 0 ? (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {domains.map((d) => (
                <FitStat
                  key={d.key}
                  icon={Layers}
                  label={d.label}
                  value={d.avg}
                  hint="Avg. distance from benchmark, per dimension"
                  tone={meterTone(d.avg)}
                />
              ))}
            </div>
          ) : (
            <FitCard className="mb-6">
              <p className="text-sm text-[#374151]">
                Your matches rest on a partial profile, so your gaps can&apos;t be split into
                behavioral style, aptitudes and core traits yet. The roles below still show how far
                you are from each benchmark on what was measured.
              </p>
            </FitCard>
          )}

          {domains.length > 0 && splitCount < matches.length && (
            <p className="-mt-3 mb-6 text-xs text-[#9ca3af]">
              Based on {splitCount} of {matches.length} roles. The others are scored on a partial profile,
              so their gap can&apos;t be split by area.
            </p>
          )}

          {topDomain && (
            <FitCard className="mb-6">
              <p className="text-sm text-[#374151]">
                Across your matches, your biggest average distance is in{" "}
                <span className="font-semibold text-[#0f766e]">{topDomain.label.toLowerCase()}</span>.
                Focusing development there tends to lift your fit across the most roles. Open any
                role below to see which dimensions make up its gap.
              </p>
            </FitCard>
          )}

          <FitCard className="mb-6">
            <FitSectionTitle>Roles with the widest gap</FitSectionTitle>
            <div className="space-y-3">
              {widestRoles.map(({ m, mean }) => (
                <Link
                  key={m.jobId}
                  to={ROUTES.JOB_FIT.detail(m.jobId)}
                  className="group block rounded-lg border border-[#e5e7eb] p-3 transition-colors hover:border-[#0D9488]"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[#1f2937]">{m.roleTitle}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#9ca3af] group-hover:text-[#0D9488]">
                      avg. {Math.round(mean)} per dimension
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                  <FitMeter value={mean} tone={meterTone(mean)} />
                </Link>
              ))}
            </div>
          </FitCard>
        </>
      )}
    </div>
  )
}
