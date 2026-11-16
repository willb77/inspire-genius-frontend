import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
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
function difficulty(amount: number, t: TFunction): { label: string; tone: Tone } {
  if (amount >= 5000) return { label: t("scholarships.competitive", "Competitive"), tone: "amber" }
  if (amount >= 2500) return { label: t("scholarships.moderate", "Moderate"), tone: "blue" }
  return { label: t("scholarships.accessible", "Accessible"), tone: "green" }
}

const ENROLLMENT_LABEL: Record<StudentProfile["enrollmentStatus"], (t: TFunction) => string> = {
  "full-time": (t) => t("scholarships.enrollment.fullTime", "full-time"),
  "part-time": (t) => t("scholarships.enrollment.partTime", "part-time"),
  "less-than-half": (t) => t("scholarships.enrollment.lessThanHalf", "less-than-half-time"),
  unknown: (t) => t("scholarships.enrollment.unknown", "enrolled"),
}

/**
 * "Why this fits you" — a one-liner grounded in the award's eligibility summary
 * and the student's saved aid profile (enrollment, state, GPA). Degrades cleanly
 * to just the eligibility summary before the profile resolves.
 */
function whyItFits(s: Scholarship, t: TFunction, profile?: StudentProfile): string {
  const base = s.eligibilitySummary.replace(/\.$/, "")
  if (!profile) return t("scholarships.matchesOnBase", { base, defaultValue: "Matches on: {{base}}." })
  const enrollment = ENROLLMENT_LABEL[profile.enrollmentStatus](t)
  if (profile.gpa) {
    return t("scholarships.whyFitsGpa", {
      base: base.toLowerCase(),
      enrollment,
      state: profile.stateOfResidence,
      gpa: profile.gpa.toFixed(1),
      defaultValue: "Matches on {{base}} — you're a {{enrollment}} student in {{state}} with a {{gpa}} GPA.",
    })
  }
  return t("scholarships.whyFits", {
    base: base.toLowerCase(),
    enrollment,
    state: profile.stateOfResidence,
    defaultValue: "Matches on {{base}} — you're a {{enrollment}} student in {{state}}.",
  })
}

/** Pipeline funnel stage config; counts are derived from match strength. */
const PIPELINE_STAGES: readonly { key: string; label: (t: TFunction) => string; tone: Tone }[] = [
  { key: "identified", label: (t) => t("scholarships.stageIdentified", "Identified"), tone: "gray" },
  { key: "in-progress", label: (t) => t("scholarships.stageInProgress", "In Progress"), tone: "blue" },
  { key: "submitted", label: (t) => t("scholarships.stageSubmitted", "Submitted"), tone: "teal" },
  { key: "awarded", label: (t) => t("scholarships.stageAwarded", "Awarded"), tone: "green" },
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
  const { t } = useTranslation("grantPages")
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
        title={t("scholarships.title", "Scholarships")}
        description={t("scholarships.description", "Matched scholarships ranked by relevance to your aid profile.")}
      />

      {/* Pipeline funnel — a quick read on how far your matches have advanced. */}
      <GrantCard className="mb-6">
        <GrantSectionTitle
          action={<span className="text-xs font-normal text-[#9ca3af]">
              {t("scholarships.advancing", { pct: pipeline.conversion, defaultValue: "{{pct}}% advancing" })}
            </span>
          }
        >
          {t("scholarships.pipeline", "Pipeline")}
        </GrantSectionTitle>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => (
            <div key={stage.key} className="rounded-lg border border-[#e5e7eb] bg-[#f9fafb] p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#6b7280]">{stage.label(t)}</span>
                <GrantPill tone={stage.tone}>{pipeline.counts[stage.key]}</GrantPill>
              </div>
            </div>
          ))}
        </div>
        <GrantMeter
          className="mt-4"
          value={pipeline.conversion}
          tone="teal"
          label={t("scholarships.submissionRate", "Submission rate")}
          right={t("scholarships.submittedOf", {
            submitted: pipeline.counts.submitted,
            identified: pipeline.counts.identified,
            defaultValue: "{{submitted}} of {{identified}}",
          })}
        />
      </GrantCard>

      <form onSubmit={runSearch} className="mb-6 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="sch-query" className="mb-1 block text-xs font-medium text-[#6b7280]">
            {t("scholarships.keywords", "Keywords")}
          </label>
          <Input
            id="sch-query"
            placeholder={t("scholarships.keywordsPlaceholder", "e.g. STEM, first-generation, nursing")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="w-40">
          <label htmlFor="sch-min" className="mb-1 block text-xs font-medium text-[#6b7280]">
            {t("scholarships.minAward", "Min award ($)")}
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
          <Search className="h-4 w-4" /> {t("scholarships.search", "Search")}
        </Button>
      </form>

      {isFetching ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <GrantEmptyState>
          {t("scholarships.noMatches", "No scholarships matched — try broadening your keywords.")}
        </GrantEmptyState>
      ) : (
        <div className="space-y-4">
          {results.map((s) => {
            const diff = difficulty(s.amount, t)
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
                      {t("scholarships.matchPct", { pct: s.matchScore, defaultValue: "{{pct}}% match" })}
                    </GrantPill>
                    <GrantPill tone={diff.tone}>{diff.label}</GrantPill>
                  </div>
                  <p className="text-sm text-[#6b7280]">{s.provider}</p>

                  <p className="mt-2 flex items-start gap-1.5 text-sm text-[#374151]">
                    <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2DD4BF]" />
                    <span>{whyItFits(s, t, profile)}</span>
                  </p>

                  <GrantMeter
                    className="mt-3 max-w-xs"
                    value={s.matchScore}
                    tone={scoreTone(s.matchScore)}
                    label={
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> {t("scholarships.matchStrength", "Match strength")}
                      </span>
                    }
                    right={`${s.matchScore}%`}
                  />
                </div>

                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                  <p className="text-xl font-bold text-[#1f2937]">{formatCurrency(s.amount)}</p>
                  <p className="text-xs text-[#9ca3af]">
                    {relativeDeadline(s.deadline, undefined, t)} · {formatDate(s.deadline)}
                  </p>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-[#3B5BFF] hover:underline"
                  >
                    {t("scholarships.viewApply", "View & apply")} <ExternalLink className="h-3.5 w-3.5" />
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
