import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ClipboardCheck } from "lucide-react"
import { useJobDnaList } from "@/hooks/job-blueprint/useJobDna"
import { usePipeline } from "@/hooks/job-blueprint/useTriage"
import { useInterviewGuide, useSubmitScorecard } from "@/hooks/job-blueprint/useScorecard"
import { ScorecardForm } from "@/components/job-blueprint/scorecard/ScorecardForm"
import { ScorecardSummary } from "@/components/job-blueprint/scorecard/ScorecardSummary"
import { InterviewGuideView } from "@/components/job-blueprint/scorecard/InterviewGuideView"
import type { DimensionBenchmark, ScorecardEntry, InterviewScorecard } from "@/types/job-blueprint"
import {
  JobDnaPageHeader,
  JobDnaCardSurface,
  JobDnaSelect,
  JobDnaEmptyState,
  JobDnaLoading,
} from "./_shared"

// Offsets keep the flattened ScorecardForm entries uniquely keyed by dimensionId
// across the four pillars (the form updates entries by id, so ids must be
// unique). They are stripped again when the payload is assembled.
const CP_OFFSET = 1000
const APT_OFFSET = 100
const TRAIT_OFFSET = 200

function topEntries(dims: DimensionBenchmark[], count: number, offset = 0): ScorecardEntry[] {
  return [...dims]
    .sort((a, b) => a.rankPosition - b.rankPosition)
    .slice(0, count)
    .map((d) => ({
      dimensionId: d.dimensionId + offset,
      dimensionName: d.dimensionName,
      score: 0 as const,
      evidence: "",
    }))
}

function strip(entries: ScorecardEntry[], offset: number): ScorecardEntry[] {
  return entries.map((e) => ({ ...e, dimensionId: e.dimensionId - offset }))
}

/**
 * Interview scorecards + guide for a role. Reads the live interview guide
 * (`GET /v1/blueprint/interview-guide/:jobId`) and submits scorecards
 * (`POST /v1/blueprint/scorecard/:candidateId`). The scorecard sections are
 * derived from the role's Job DNA benchmark. Submitting requires a candidate,
 * which comes from the (server-gated) pipeline.
 */
export default function JobBlueprintScorecardsPage() {
  const { data: jobDnas, isLoading: loadingJobs } = useJobDnaList()
  const [jobId, setJobId] = useState("")
  const [candidateId, setCandidateId] = useState("")
  const [result, setResult] = useState<InterviewScorecard | null>(null)

  const { data: guide } = useInterviewGuide(jobId)
  const { data: candidates } = usePipeline(jobId)
  const submitScorecard = useSubmitScorecard()

  const jobDna = useMemo(() => jobDnas?.find((jd) => jd.id === jobId), [jobDnas, jobId])

  const sections = useMemo(() => {
    if (!jobDna) return []
    return [
      { title: "Top 3 Behaviours (max 15)", entries: topEntries(jobDna.behaviors, 3) },
      {
        title: "Counter-Productive Behaviours (max 10)",
        isCounterProductive: true,
        entries: topEntries([...jobDna.behaviors].reverse(), 2, CP_OFFSET),
      },
      { title: "Top 3 Work Aptitudes (max 15)", entries: topEntries(jobDna.aptitudes, 3, APT_OFFSET) },
      { title: "Top 3 Core Traits (max 15)", entries: topEntries(jobDna.coreTraits, 3, TRAIT_OFFSET) },
    ]
  }, [jobDna])

  const handleSubmit = async (entries: ScorecardEntry[], notes: string) => {
    if (!candidateId) {
      toast.error("Select a candidate before submitting a scorecard.")
      return
    }
    const behaviorScores = entries.filter((e) => e.dimensionId < APT_OFFSET)
    const aptitudeScores = strip(
      entries.filter((e) => e.dimensionId >= APT_OFFSET && e.dimensionId < TRAIT_OFFSET),
      APT_OFFSET
    )
    const coreTraitScores = strip(
      entries.filter((e) => e.dimensionId >= TRAIT_OFFSET && e.dimensionId < CP_OFFSET),
      TRAIT_OFFSET
    )
    const counterProductiveScores = strip(
      entries.filter((e) => e.dimensionId >= CP_OFFSET),
      CP_OFFSET
    )

    try {
      const scorecard = await submitScorecard.mutateAsync({
        candidateId,
        data: {
          jobId,
          interviewerId: "",
          interviewDate: new Date().toISOString(),
          behaviorScores,
          counterProductiveScores,
          aptitudeScores,
          coreTraitScores,
          notes,
        },
      })
      if (scorecard) {
        setResult(scorecard)
        toast.success("Scorecard submitted.")
      }
    } catch {
      toast.error("Failed to submit scorecard.")
    }
  }

  return (
    <div className="max-w-5xl">
      <JobDnaPageHeader
        icon={ClipboardCheck}
        title="Scorecards"
        description="Structured interview scorecards and guides derived from a role's Job DNA benchmark."
        action={
          <JobDnaSelect
            jobDnas={jobDnas ?? []}
            value={jobId}
            onChange={(id) => {
              setJobId(id)
              setCandidateId("")
              setResult(null)
            }}
          />
        }
      />

      {loadingJobs ? (
        <JobDnaLoading label="Loading roles…" />
      ) : !jobId ? (
        <JobDnaEmptyState>Select a role to build its scorecard and interview guide.</JobDnaEmptyState>
      ) : (
        <div className="space-y-6">
          {guide ? (
            <JobDnaCardSurface>
              <InterviewGuideView guide={guide} />
            </JobDnaCardSurface>
          ) : (
            <JobDnaEmptyState>
              No interview guide generated for this role yet.
            </JobDnaEmptyState>
          )}

          <JobDnaCardSurface>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm text-[#374151]">
                <span className="font-medium">Candidate:</span>
                <select
                  className="h-9 min-w-56 rounded-md border border-input bg-transparent px-3 text-sm"
                  value={candidateId}
                  onChange={(e) => setCandidateId(e.target.value)}
                >
                  <option value="">Select a candidate…</option>
                  {(candidates ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {(candidates ?? []).length === 0 ? (
                <span className="text-xs text-[#9ca3af]">
                  Candidate pipeline is gated for this account — the form is preview-only.
                </span>
              ) : null}
            </div>

            {sections.length > 0 ? (
              <ScorecardForm
                sections={sections}
                onSubmit={handleSubmit}
                isSubmitting={submitScorecard.isPending}
              />
            ) : null}
          </JobDnaCardSurface>

          {result ? (
            <ScorecardSummary grandTotal={result.grandTotal} recommendation={result.recommendation} />
          ) : null}
        </div>
      )}
    </div>
  )
}
