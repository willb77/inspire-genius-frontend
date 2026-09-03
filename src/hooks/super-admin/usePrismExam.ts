import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  cancelRun,
  diffRuns,
  getActiveQuestionSet,
  getQuestionSet,
  getRun,
  listAnswers,
  listQuestionSets,
  listRuns,
  replaceActiveQuestionSet,
  startRun,
} from "@/services/super-admin/prism-exam/prismExam.service"
import type { AnswerFilters, ExamRun, ExamRunDetail } from "@/types/prism-exam"
import { ACTIVE_RUN_STATUSES } from "@/types/prism-exam"

const KEY = "prism-exam"

/** Poll cadence while a run is in flight; a run takes minutes, so seconds are plenty. */
export const ACTIVE_POLL_MS = 4_000

export function isRunActive(run: Pick<ExamRun, "status"> | undefined | null): boolean {
  return !!run && ACTIVE_RUN_STATUSES.includes(run.status)
}

// ── question sets ────────────────────────────────────────────────────

export function useExamQuestionSets() {
  return useQuery({ queryKey: [KEY, "question-sets"], queryFn: listQuestionSets, staleTime: 60_000 })
}

export function useActiveQuestionSet() {
  return useQuery({ queryKey: [KEY, "question-set", "active"], queryFn: getActiveQuestionSet, staleTime: 60_000 })
}

export function useExamQuestionSet(setId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "question-set", setId ?? ""],
    queryFn: () => getQuestionSet(setId as string),
    enabled: !!setId,
    staleTime: 60_000,
  })
}

export function useReplaceQuestionSet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: replaceActiveQuestionSet,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY, "question-sets"] })
      void qc.invalidateQueries({ queryKey: [KEY, "question-set"] })
    },
  })
}

// ── runs ─────────────────────────────────────────────────────────────

export function useExamRuns(limit = 50, allTiers = false) {
  return useQuery({
    queryKey: [KEY, "runs", limit, allTiers],
    queryFn: () => listRuns(limit, allTiers),
    staleTime: 5_000,
    refetchInterval: (query) => (query.state.data?.some(isRunActive) ? ACTIVE_POLL_MS : false),
  })
}

export function useExamRun(runId: string | undefined) {
  return useQuery({
    queryKey: [KEY, "run", runId ?? ""],
    queryFn: () => getRun(runId as string),
    enabled: !!runId,
    staleTime: 2_000,
    retry: false,
    refetchInterval: (query) => (isRunActive(query.state.data as ExamRunDetail | undefined) ? ACTIVE_POLL_MS : false),
  })
}

export function useExamAnswers(runId: string | undefined, filters: AnswerFilters = {}, active = false) {
  return useQuery({
    queryKey: [KEY, "answers", runId ?? "", filters.verdict ?? "", filters.chapter ?? ""],
    queryFn: () => listAnswers(runId as string, filters),
    enabled: !!runId,
    staleTime: 2_000,
    refetchInterval: active ? ACTIVE_POLL_MS : false,
  })
}

export function useStartExamRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: startRun,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: [KEY, "runs"] })
    },
  })
}

export function useCancelExamRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelRun,
    onSuccess: (run) => {
      qc.setQueryData([KEY, "run", run.id], (prev: ExamRunDetail | undefined) => (prev ? { ...prev, ...run } : prev))
      void qc.invalidateQueries({ queryKey: [KEY, "runs"] })
      void qc.invalidateQueries({ queryKey: [KEY, "run", run.id] })
    },
  })
}

export function useExamDiff(runA: string | undefined, runB: string | undefined) {
  return useQuery({
    queryKey: [KEY, "diff", runA ?? "", runB ?? ""],
    queryFn: () => diffRuns(runA as string, runB as string),
    enabled: !!runA && !!runB && runA !== runB,
    staleTime: 60_000,
    retry: false,
  })
}
