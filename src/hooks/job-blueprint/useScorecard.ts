import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { scorecardService } from '@/services/job-blueprint'
import type { ScorecardEntry } from '@/types/job-blueprint'

const KEYS = {
  all: ['scorecard'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  guide: (jobId: string) => [...KEYS.all, 'guide', jobId] as const,
}

export function useScorecardDetail(candidateId: string) {
  return useQuery({
    queryKey: KEYS.detail(candidateId),
    queryFn: () => scorecardService.getScorecard(candidateId).then(r => r.data.data),
    enabled: !!candidateId,
  })
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
