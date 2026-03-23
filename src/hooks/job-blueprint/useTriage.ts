import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { triageService } from '@/services/job-blueprint'

const KEYS = {
  all: ['triage'] as const,
  pipeline: (jobId: string) => [...KEYS.all, 'pipeline', jobId] as const,
  candidate: (id: string) => [...KEYS.all, 'candidate', id] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
  insights: (id: string) => [...KEYS.all, 'insights', id] as const,
}

export function usePipeline(jobId: string, compare?: boolean) {
  return useQuery({
    queryKey: [...KEYS.pipeline(jobId), { compare }],
    queryFn: () => triageService.getPipeline(jobId, compare).then(r => r.data.data ?? []),
    enabled: !!jobId,
  })
}

export function useCandidateDetail(candidateId: string) {
  return useQuery({
    queryKey: KEYS.candidate(candidateId),
    queryFn: () => triageService.getCandidate(candidateId).then(r => r.data.data),
    enabled: !!candidateId,
  })
}

export function usePipelineStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: () => triageService.getStats().then(r => r.data.data),
  })
}

export function useCandidateInsights(candidateId: string) {
  return useQuery({
    queryKey: KEYS.insights(candidateId),
    queryFn: () => triageService.getInsights(candidateId).then(r => r.data.data),
    enabled: !!candidateId,
  })
}

export function useSubmitIntake() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { jobId: string; name: string; email: string; code?: string }) =>
      triageService.submitIntake(data).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.pipeline(vars.jobId) })
      qc.invalidateQueries({ queryKey: KEYS.stats() })
    },
  })
}

export function useAdvanceCandidate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (candidateId: string) =>
      triageService.advanceCandidate(candidateId).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.all })
    },
  })
}
