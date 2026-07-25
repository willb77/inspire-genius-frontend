import { useMemo } from "react"
import { Link } from "react-router-dom"
import { Layers, ChevronRight } from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useFitMatches } from "@/hooks/job-fit/useFitMatches"
import type { FitMatch } from "@/types/job-fit"
import {
  FitPageHeader,
  FitCard,
  FitStat,
  FitMeter,
  FitSectionTitle,
  FitEmptyState,
  FitLoading,
  FitError,
} from "./_shared"
import { MatchingValidationBanner } from "@/components/job-fit/MatchingValidationBanner"
import type { Tone } from "./_fit"

type DomainAggregate = {
  key: "behavior" | "aptitude" | "coreTrait"
  label: string
  avg: number
}

/** Average each variation domain across every matched role. */
function aggregate(matches: FitMatch[]): DomainAggregate[] {
  if (matches.length === 0) return []
  const sum = matches.reduce(
    (acc, m) => ({
      behavior: acc.behavior + m.behaviorVariation,
      aptitude: acc.aptitude + m.aptitudeVariation,
      coreTrait: acc.coreTrait + m.coreTraitVariation,
    }),
    { behavior: 0, aptitude: 0, coreTrait: 0 }
  )
  const n = matches.length
  return [
    { key: "behavior", label: "Behavioral style", avg: Math.round(sum.behavior / n) },
    { key: "aptitude", label: "Aptitudes", avg: Math.round(sum.aptitude / n) },
    { key: "coreTrait", label: "Core traits", avg: Math.round(sum.coreTrait / n) },
  ]
}

function meterTone(avg: number): Tone {
  if (avg <= 12) return "green"
  if (avg <= 25) return "teal"
  if (avg <= 40) return "amber"
  return "red"
}

/**
 * Aggregate view of where the user's profile diverges from role benchmarks,
 * summarised across all matched roles. Derived entirely from the ranked matches
 * list so it stays a single query — a bird's-eye complement to per-role detail.
 */
export default function GapsPage() {
  const { data, isLoading, isError } = useFitMatches()

  const matches = useMemo(() => data ?? [], [data])
  const domains = useMemo(() => aggregate(matches), [matches])
  const widestRoles = useMemo(
    () => [...matches].sort((a, b) => b.totalVariation - a.totalVariation).slice(0, 5),
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

      <div className="mb-5">
        <MatchingValidationBanner />
      </div>

      {isLoading && <FitLoading label="Aggregating gaps across your matches…" />}

      {isError && <FitError>We couldn&apos;t load your gap summary right now.</FitError>}

      {!isLoading && !isError && matches.length === 0 && (
        <FitEmptyState>
          No matched roles yet, so there are no gaps to summarise. Your gap picture appears once roles
          are available to match against.
        </FitEmptyState>
      )}

      {!isLoading && !isError && matches.length > 0 && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {domains.map((d) => (
              <FitStat
                key={d.key}
                icon={Layers}
                label={d.label}
                value={d.avg}
                hint="Avg. distance from benchmark"
                tone={meterTone(d.avg)}
              />
            ))}
          </div>

          {topDomain && (
            <FitCard className="mb-6">
              <p className="text-sm text-[#374151]">
                Across your matches, your biggest average distance is in{" "}
                <span className="font-semibold text-[#0f766e]">{topDomain.label.toLowerCase()}</span>.
                Focusing development there tends to lift your fit across the most roles.
              </p>
            </FitCard>
          )}

          <FitCard className="mb-6">
            <FitSectionTitle>Roles with the widest gap</FitSectionTitle>
            <div className="space-y-3">
              {widestRoles.map((m) => (
                <Link
                  key={m.jobId}
                  to={ROUTES.JOB_FIT.detail(m.jobId)}
                  className="group block rounded-lg border border-[#e5e7eb] p-3 transition-colors hover:border-[#0D9488]"
                >
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-[#1f2937]">{m.roleTitle}</span>
                    <span className="inline-flex items-center gap-1 text-xs text-[#9ca3af] group-hover:text-[#0D9488]">
                      {m.totalVariation}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                  <FitMeter value={Math.min(100, m.totalVariation)} tone={meterTone(m.totalVariation)} />
                </Link>
              ))}
            </div>
          </FitCard>
        </>
      )}
    </div>
  )
}
