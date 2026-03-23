import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { jobDnaService } from '@/services/job-blueprint'
import type { JobDNA, DimensionBenchmark } from '@/types/job-blueprint'

const KEYS = {
  all: ['job-dna'] as const,
  list: () => [...KEYS.all, 'list'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
  benchmark: (id: string) => [...KEYS.all, 'benchmark', id] as const,
}

export function useJobDnaList() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: () => jobDnaService.list().then(r => r.data.data ?? []),
  })
}

export function useJobDnaDetail(id: string) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => jobDnaService.getById(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useJobDnaBenchmark(id: string) {
  return useQuery({
    queryKey: KEYS.benchmark(id),
    queryFn: () => jobDnaService.getBenchmark(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCreateJobDna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<JobDNA>) => jobDnaService.create(data).then(r => r.data.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.list() }) },
  })
}

export function useUpdateJobDna() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<JobDNA> }) =>
      jobDnaService.update(id, data).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) })
      qc.invalidateQueries({ queryKey: KEYS.list() })
    },
  })
}

export function useFinalizeBenchmark() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, benchmark }: { id: string; benchmark: { behaviors: DimensionBenchmark[]; aptitudes: DimensionBenchmark[]; coreTraits: DimensionBenchmark[] } }) =>
      jobDnaService.finalizeBenchmark(id, benchmark).then(r => r.data.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.id) })
      qc.invalidateQueries({ queryKey: KEYS.benchmark(vars.id) })
    },
  })
}
