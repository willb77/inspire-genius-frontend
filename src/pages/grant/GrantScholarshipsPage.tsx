import { useMemo, useState } from "react"
import { Award, Search, ExternalLink, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useScholarships } from "@/hooks/grant/useScholarships"
import type { ScholarshipQuery } from "@/types/grant"
import { GrantPageHeader, GrantCard, GrantEmptyState, GrantPill } from "./_shared"
import { formatCurrency, formatDate } from "./_format"

/** Match-score → pill tone: strong match teal, decent blue, weak gray. */
function scoreTone(score: number): "teal" | "blue" | "gray" {
  if (score >= 85) return "teal"
  if (score >= 70) return "blue"
  return "gray"
}

/**
 * UI-2 — Scholarships.
 *
 * Interactive search + ranked match list against the student's aid profile.
 * Free-text query and a minimum-award filter drive `useScholarships`; results
 * are sorted by match score with an apply-out link per award. Mock-backed for
 * UI-0 until the /v1/scholarships endpoint is wired (flip USE_GRANT_MOCKS).
 */
export default function GrantScholarshipsPage() {
  const [query, setQuery] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [params, setParams] = useState<ScholarshipQuery>({})

  const { data, isFetching } = useScholarships(params)

  const results = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.matchScore - a.matchScore),
    [data]
  )

  function runSearch(e: React.FormEvent) {
    e.preventDefault()
    const next: ScholarshipQuery = {}
    if (query.trim()) next.query = query.trim()
    const min = Number(minAmount)
    if (minAmount.trim() && !Number.isNaN(min) && min > 0) next.minAmount = min
    setParams(next)
  }

  return (
    <div className="max-w-4xl">
      <GrantPageHeader
        icon={Award}
        title="Scholarships"
        description="Matched scholarships ranked by relevance to your aid profile."
      />

      <form onSubmit={runSearch} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="sch-query" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Keywords
          </label>
          <Input
            id="sch-query"
            placeholder="e.g. STEM, first-generation, nursing"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-40">
          <label htmlFor="sch-min" className="mb-1 block text-xs font-medium text-[#6b7280]">
            Min award ($)
          </label>
          <Input
            id="sch-min"
            type="number"
            inputMode="numeric"
            placeholder="1000"
            value={minAmount}
            onChange={(e) => setMinAmount(e.target.value)}
          />
        </div>
        <Button type="submit" className="gap-2 bg-[#3B5BFF] hover:bg-[#2f4ad9]">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {isFetching ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <GrantEmptyState>No scholarships matched — try broadening your keywords.</GrantEmptyState>
      ) : (
        <div className="space-y-4">
          {results.map((s) => (
            <GrantCard
              key={s.id}
              className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="truncate text-base font-semibold text-[#1f2937]">{s.name}</h2>
                  <GrantPill tone={scoreTone(s.matchScore)}>
                    <TrendingUp className="mr-1 h-3 w-3" />
                    {s.matchScore}% match
                  </GrantPill>
                </div>
                <p className="text-sm text-[#6b7280]">{s.provider}</p>
                <p className="mt-2 text-sm text-[#374151]">{s.eligibilitySummary}</p>
                <p className="mt-1 text-xs text-[#9ca3af]">Deadline: {formatDate(s.deadline)}</p>
              </div>
              <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                <p className="text-xl font-bold text-[#1f2937]">{formatCurrency(s.amount)}</p>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-[#3B5BFF] hover:underline"
                >
                  View &amp; apply <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </GrantCard>
          ))}
        </div>
      )}
    </div>
  )
}
