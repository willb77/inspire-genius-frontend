import { useMemo, useState } from "react"
import { Award, Search, ExternalLink, TrendingUp, Sparkles, Target } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useScholarships } from "@/hooks/grant/useScholarships"
import { useStudentProfile } from "@/hooks/grant/useProfile"
import type { Scholarship, ScholarshipQuery, StudentProfile } from "@/types/grant"
import {
  GrantPageHeader,
  GrantCard,
  GrantEmptyState,
  GrantPill,
  GrantMeter,
  GrantSectionTitle,
} from "./_shared"
import { formatCurrency, formatDate, relativeDeadline } from "./_format"

type Tone = "blue" | "teal" | "amber" | "red" | "gray" | "green"

/** Match-score → pill/meter tone: strong match teal, decent blue, weak gray. */
function scoreTone(score: number): "teal" | "blue" | "gray" {
  if (score >= 85) return "teal"
  if (score >= 70) return "blue"
  return "gray"
}

/** Award size → competitiveness cue. Bigger purses draw a deeper applicant pool. */
function difficulty(amount: number): { label: string; tone: Tone } {
  if (amount >= 5000) return { label: "Competitive", tone: "amber" }
  if (amount >= 2500) return { label: "Moderate", tone: "blue" }
  return { label: "Accessible", tone: "green" }
}

const ENROLLMENT_LABEL: Record<StudentProfile["enrollmentStatus"], string> = {
  "full-time": "full-time",
  "part-time": "part-time",
  "less-than-half": "less-than-half-time",
  unknown: "enrolled",
}

/**
 * "Why this fits you" — a one-liner grounded in the award's eligibility summary
 * and the student's saved aid profile (enrollment, state, GPA). Degrades cleanly
 * to just the eligibility summary before the profile resolves.
 */
function whyItFits(s: Scholarship, profile?: StudentProfile): string {
  const base = s.eligibilitySummary.replace(/\.$/, "")
  if (!profile) return `Matches on: ${base}.`
  const you = `a ${ENROLLMENT_LABEL[profile.enrollmentStatus]} student in ${profile.stateOfResidence}`
  const gpa = profile.gpa ? ` with a ${profile.gpa.toFixed(1)} GPA` : ""
  return `Matches on ${base.toLowerCase()} — you're ${you}${gpa}.`
}

/** Pipeline funnel stage config; counts are derived from match strength. */
const PIPELINE_STAGES: readonly { key: string; label: string; tone: Tone }[] = [
  { key: "identified", label: "Identified", tone: "gray" },
  { key: "in-progress", label: "In Progress", tone: "blue" },
  { key: "submitted", label: "Submitted", tone: "teal" },
  { key: "awarded", label: "Awarded", tone: "green" },
]

/**
 * UI-2 — Scholarships.
 *
 * A pipeline funnel strip plus an interactive search + ranked match list against
 * the student's aid profile. Free-text query and a minimum-award filter drive
 * `useScholarships`; results sort by match score, each shown as a rich match card
 * (award, relative deadline, difficulty, match meter, and a personalized "why
 * this fits" line). Mock-backed for UI-0 until /v1/scholarships is wired.
 */
export default function GrantScholarshipsPage() {
  const [query, setQuery] = useState("")
  const [minAmount, setMinAmount] = useState("")
  const [params, setParams] = useState<ScholarshipQuery>({})

  const { data, isFetching } = useScholarships(params)
  const { data: profile } = useStudentProfile()

  const results = useMemo(
    () => [...(data ?? [])].sort((a, b) => b.matchScore - a.matchScore),
    [data]
  )

  // Synthetic funnel: each higher match-score band advances further down the pipe.
  const pipeline = useMemo(() => {
    const identified = results.length
    const inProgress = results.filter((s) => s.matchScore >= 80).length
    const submitted = results.filter((s) => s.matchScore >= 88).length
    const awarded = results.filter((s) => s.matchScore >= 92).length
    const counts: Record<string, number> = {
      identified,
      "in-progress": inProgress,
      submitted,
      awarded,
    }
    const conversion = identified > 0 ? Math.round((submitted / identified) * 100) : 0
    return { counts, conversion }
  }, [results])

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

      {/* Pipeline funnel — a quick read on how far your matches have advanced. */}
      <GrantCard className="mb-6">
        <GrantSectionTitle
          action={<span className="text-xs font-normal text-[#9ca3af]">{pipeline.conversion}% advancing</span>}
        >
          Pipeline
        </GrantSectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.key} className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#6b7280]">{stage.label}</span>
                <GrantPill tone={stage.tone}>{pipeline.counts[stage.key]}</GrantPill>
              </div>
            </div>
          ))}
        </div>
        <GrantMeter
          className="mt-4"
          value={pipeline.conversion}
          tone="teal"
          label="Submission rate"
          right={`${pipeline.counts.submitted} of ${pipeline.counts.identified}`}
        />
      </GrantCard>

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
          {results.map((s) => {
            const diff = difficulty(s.amount)
            return (
              <GrantCard
                key={s.id}
                className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-[#1f2937]">{s.name}</h2>
                    <GrantPill tone={scoreTone(s.matchScore)}>
                      <TrendingUp className="mr-1 h-3 w-3" />
                      {s.matchScore}% match
                    </GrantPill>
                    <GrantPill tone={diff.tone}>{diff.label}</GrantPill>
                  </div>
                  <p className="text-sm text-[#6b7280]">{s.provider}</p>

                  <p className="mt-2 flex items-start gap-1.5 text-sm text-[#374151]">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2DD4BF]" />
                    <span>{whyItFits(s, profile)}</span>
                  </p>

                  <GrantMeter
                    className="mt-3 max-w-xs"
                    value={s.matchScore}
                    tone={scoreTone(s.matchScore)}
                    label={
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> Match strength
                      </span>
                    }
                    right={`${s.matchScore}%`}
                  />
                </div>

                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <p className="text-xl font-bold text-[#1f2937]">{formatCurrency(s.amount)}</p>
                  <p className="text-xs text-[#9ca3af]">
                    {relativeDeadline(s.deadline)} · {formatDate(s.deadline)}
                  </p>
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
            )
          })}
        </div>
      )}
    </div>
  )
}
