import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { scorecardService } from '@/services/job-blueprint'
import type { InterviewScorecard, ScorecardEntry } from '@/types/job-blueprint'

const KEYS = {
  all: ['scorecard'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  guide: (jobId: string) => [...KEYS.all, 'guide', jobId] as const,
}

/** "No scorecard for candidate" is a 404 — a state, not a transient failure. */
export function isNoScorecardError(err: unknown): boolean {
  return (err as AxiosError | undefined)?.response?.status === 404
}

function retryUnless404(failureCount: number, err: unknown): boolean {
  return !isNoScorecardError(err) && failureCount < 2
}

/**
 * One candidate's submitted scorecard (GET /v1/blueprint/scorecard/{candidateId}).
 * A 404 means none has been submitted yet; callers read `isNoScorecardError`
 * on the error and render that honestly instead of retrying.
 */
export function useScorecardDetail(candidateId: string) {
  return useQuery<InterviewScorecard | undefined, AxiosError>({
    queryKey: KEYS.detail(candidateId),
    queryFn: () => scorecardService.getScorecard(candidateId).then(r => r.data.data),
    enabled: !!candidateId,
    retry: retryUnless404,
  })
}

/**
 * The scorecards of several candidates at once — the side-by-side comparison
 * on the Scorecards page. One read per candidate, same cache keys as
 * `useScorecardDetail`, so a candidate opened elsewhere is not refetched.
 * Returns only the scorecards that exist; `pending` is true while any read is
 * in flight; `missing` lists candidates the server has no scorecard for.
 */
export function useScorecardsFor(candidateIds: string[]) {
  const results = useQueries({
    queries: candidateIds.map((id) => ({
      queryKey: KEYS.detail(id),
      queryFn: () => scorecardService.getScorecard(id).then(r => r.data.data),
      retry: retryUnless404,
    })),
  })
  const scorecards: InterviewScorecard[] = []
  const missing: string[] = []
  let pending = false
  let failed = false
  results.forEach((r, i) => {
    if (r.isPending) pending = true
    else if (r.data) scorecards.push(r.data)
    else if (r.isError && isNoScorecardError(r.error)) missing.push(candidateIds[i])
    else if (r.isError) failed = true
  })
  return { scorecards, missing, pending, failed }
}

export function useInterviewGuide(jobId: string) {
  return useQuery({
    queryKey: KEYS.guide(jobId),
    queryFn: () => scorecardService.getInterviewGuide(jobId).then(r => r.data.data),
    enabled: !!jobId,
  })
}

export function useSubmitScorecard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ candidateId, data }: {
      candidateId: string
      data: {
        jobId: string
        interviewerId: string
        interviewDate: string
        behaviorScores: ScorecardEntry[]
        counterProductiveScores: ScorecardEntry[]
        aptitudeScores: ScorecardEntry[]
        coreTraitScores: ScorecardEntry[]
        notes: string
      }
    }) => scorecardService.submitScorecard(candidateId, data).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.candidateId) })
    },
  })
}

export function useGenerateInterviewGuide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ jobId, candidateId }: { jobId: string; candidateId: string }) =>
      scorecardService.generateInterviewGuide(jobId, candidateId).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.guide(vars.jobId) })
    },
  })
}
