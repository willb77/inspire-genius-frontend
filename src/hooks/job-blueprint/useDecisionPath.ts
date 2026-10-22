import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { decisionPathService } from '@/services/job-blueprint/decision-path.service'
import type {
  DecisionAnswers,
  DecisionBody,
  DecisionCaseBody,
  DecisionPathStatus,
  DecisionRuleSetBody,
} from '@/types/job-blueprint'

/**
 * Decision path. `useDecisionPathStatus` is the one gate the UI reads: the
 * server answers 403 on every route while the switch is off for the caller, and
 * that — or any failure — reads as "not enabled", so nothing renders and every
 * existing page is exactly what it was.
 */
const KEYS = {
  all: ['decision-path'] as const,
  status: () => [...KEYS.all, 'status'] as const,
  ruleSets: () => [...KEYS.all, 'rule-sets'] as const,
  cases: () => [...KEYS.all, 'cases'] as const,
  record: (id: string) => [...KEYS.all, 'record', id] as const,
}

export function useDecisionPathStatus(): DecisionPathStatus | null {
  const q = useQuery({
    queryKey: KEYS.status(),
    queryFn: () => decisionPathService.status().then((r) => r.data.data),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
  return q.data?.enabled === true ? q.data : null
}

export function useDecisionRuleSets(enabled: boolean) {
  return useQuery({
    queryKey: KEYS.ruleSets(),
    queryFn: () => decisionPathService.ruleSets().then((r) => r.data.data ?? []),
    enabled,
    retry: false,
  })
}

export function useDecisionCases(enabled: boolean) {
  return useQuery({
    queryKey: KEYS.cases(),
    queryFn: () => decisionPathService.cases().then((r) => r.data.data ?? []),
    enabled,
    retry: false,
  })
}

export function useDecisionRecord(id: string, enabled: boolean) {
  return useQuery({
    queryKey: KEYS.record(id),
    queryFn: () => decisionPathService.record(id).then((r) => r.data.data),
    enabled: enabled && !!id,
    retry: false,
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => void qc.invalidateQueries({ queryKey: KEYS.all })
}

export function useSaveRuleSet() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: DecisionRuleSetBody }) =>
      (id ? decisionPathService.updateRuleSet(id, body) : decisionPathService.createRuleSet(body)).then(
        (r) => r.data.data,
      ),
    onSuccess: invalidate,
  })
}

export function useNewRuleSetVersion() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => decisionPathService.newVersion(id).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

export function useActivateRuleSet() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (id: string) => decisionPathService.activate(id).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

export function useOpenDecisionCase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: (body: DecisionCaseBody) => decisionPathService.openCase(body).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

export function useRecheckCase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, answers }: { id: string; answers: DecisionAnswers }) =>
      decisionPathService.recheck(id, answers).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

export function useRecordDecision() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, body, amend }: { id: string; body: DecisionBody; amend?: boolean }) =>
      (amend ? decisionPathService.amend(id, body) : decisionPathService.decide(id, body)).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

export function useWithdrawCase() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      decisionPathService.withdraw(id, reason).then((r) => r.data.data),
    onSuccess: invalidate,
  })
}

/** The server's refusal, in its own words (a string, or a list of problems). */
export function decisionPathErrorMessage(err: unknown, fallback: string): string {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail
  if (typeof detail === 'string' && detail.trim()) return detail
  if (Array.isArray(detail)) {
    const parts = detail.map((d) => (typeof d === 'string' ? d : (d as { msg?: string })?.msg)).filter(Boolean)
    if (parts.length) return parts.join(' ')
  }
  return fallback
}
