import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { validationService } from '@/services/job-blueprint/validation.service'
import { exportRationaleWord } from '@/lib/exportBlueprintRationale'
import type {
  ValidationRecordBody,
  ValidationRequestBody,
  ValidationVerdictBody,
} from '@/types/job-blueprint'

/**
 * N-4 — Job DNA validation (employer / SME sign-off) and the Rationale Report.
 *
 * `useValidationEnabled` is the one gate the UI reads: the server answers 403
 * on every validation route while the `blueprint_validation` switch is off for
 * the caller, and that — or any failure — reads as "not enabled", so the panel
 * stays hidden and the page is exactly what it was.
 */
const KEYS = {
  all: ['blueprint-validation'] as const,
  status: () => [...KEYS.all, 'status'] as const,
  awaiting: () => [...KEYS.all, 'awaiting'] as const,
  detail: (id: string) => [...KEYS.all, 'detail', id] as const,
}

export function useValidationEnabled(): boolean {
  const q = useQuery({
    queryKey: KEYS.status(),
    queryFn: () => validationService.status().then((r) => r.data.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  return q.data?.enabled === true
}

export function useBlueprintValidation(id: string, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.detail(id),
    queryFn: () => validationService.get(id).then((r) => r.data.data),
    enabled: enabled && !!id,
    retry: false,
  })
}

export function useAwaitingValidation(enabled: boolean) {
  return useQuery({
    queryKey: KEYS.awaiting(),
    queryFn: () => validationService.awaiting().then((r) => r.data.data ?? []),
    enabled,
    retry: false,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return (id: string) => {
    void qc.invalidateQueries({ queryKey: KEYS.detail(id) })
    void qc.invalidateQueries({ queryKey: KEYS.awaiting() })
  }
}

export function useRequestValidation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ValidationRequestBody }) =>
      validationService.request(id, body).then((r) => r.data.data),
    onSuccess: (_, vars) => invalidate(vars.id),
  })
}

export function useGiveVerdict() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ValidationVerdictBody }) =>
      validationService.verdict(id, body).then((r) => r.data.data),
    onSuccess: (_, vars) => invalidate(vars.id),
  })
}

export function useRecordAttestation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ValidationRecordBody }) =>
      validationService.record(id, body).then((r) => r.data.data),
    onSuccess: (_, vars) => invalidate(vars.id),
  })
}

export function useWithdrawValidation() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) =>
      validationService.withdraw(id, note).then((r) => r.data.data),
    onSuccess: (_, vars) => invalidate(vars.id),
  })
}

/** The Rationale Report JSON, for reading on screen (the reviewer's screen). */
export function useRationale(id: string, enabled: boolean) {
  return useQuery({
    queryKey: [...KEYS.all, 'rationale', id] as const,
    queryFn: () => validationService.rationale(id).then((r) => r.data.data),
    enabled: enabled && !!id,
    retry: false,
  })
}

/** Reads the server's Rationale Report JSON and saves it as a Word file. */
export function useExportRationale() {
  return useMutation({
    mutationFn: async (id: string) => {
      const report = await validationService.rationale(id).then((r) => r.data.data)
      if (!report) throw new Error('The server returned no report')
      await exportRationaleWord(report)
      return report
    },
  })
}

/** The server's refusal, in its own words, for a failed validation call. */
export function validationErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  return typeof detail === 'string' && detail.trim() ? detail : fallback
}
