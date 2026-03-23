import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { assessmentService } from '@/services/job-blueprint'
import type { BMLResponse } from '@/types/job-blueprint'

const KEYS = {
  all: ['assessment'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  results: (id: string) => [...KEYS.all, 'results', id] as const,
  stats: () => [...KEYS.all, 'stats'] as const,
}

export function useAssessmentDetail(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => assessmentService.getById(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useAssessmentResults(id: string) {
  return useQuery({
    queryKey: KEYS.results(id),
    queryFn: () => assessmentService.getResults(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useAssessmentStats() {
  return useQuery({
    queryKey: KEYS.stats(),
    queryFn: () => assessmentService.getStats().then(r => r.data.data),
  })
}

export function useCreateAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { candidateId: string; jobId: string }) =>
      assessmentService.create(data).then(r => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all }) },
  })
}

export function useSubmitAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, responses }: { id: string; responses: BMLResponse[] }) =>
      assessmentService.submit(id, responses).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) })
      qc.invalidateQueries({ queryKey: KEYS.results(vars.id) })
    },
  })
}
