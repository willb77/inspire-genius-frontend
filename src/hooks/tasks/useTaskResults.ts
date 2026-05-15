/**
 * React Query hooks for the task-result workspace library.
 *
 * Backed by agent-engine's POST/GET/GET/DELETE /v1/tasks/results endpoints
 * (extracted from the monolith 2026-05-15). The list view caches per
 * filter; the detail view caches per id; mutations invalidate both keys
 * so the library page reflects writes immediately.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  tasksService,
  type SavedTaskResultRow,
  type SavedTaskResultDetail,
  type SavedTaskResultsList,
  type SaveTaskResultRequest,
} from "@/services/tasks/tasks.service"

/** Query keys — exported so components / tests can prefill or invalidate. */
export const taskResultsKeys = {
  all: ["task-results"] as const,
  lists: () => [...taskResultsKeys.all, "list"] as const,
  list: (params: { task_slug?: string; limit?: number; offset?: number } | undefined) =>
    [...taskResultsKeys.lists(), params ?? {}] as const,
  details: () => [...taskResultsKeys.all, "detail"] as const,
  detail: (id: string) => [...taskResultsKeys.details(), id] as const,
}

export function useListTaskResults(params?: {
  task_slug?: string
  limit?: number
  offset?: number
}) {
  return useQuery<SavedTaskResultsList>({
    queryKey: taskResultsKeys.list(params),
    queryFn: () => tasksService.listResults(params),
    staleTime: 30_000,
  })
}

export function useTaskResultDetail(id: string | null | undefined) {
  return useQuery<SavedTaskResultDetail>({
    queryKey: taskResultsKeys.detail(id ?? ""),
    queryFn: () => tasksService.getResult(id as string),
    enabled: Boolean(id),
    staleTime: 60_000,
  })
}

export function useSaveTaskResult() {
  const qc = useQueryClient()
  return useMutation<SavedTaskResultRow, Error, SaveTaskResultRequest>({
    mutationFn: tasksService.saveResult,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskResultsKeys.lists() })
    },
  })
}

export function useDeleteTaskResult() {
  const qc = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: tasksService.deleteResult,
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: taskResultsKeys.lists() })
      qc.removeQueries({ queryKey: taskResultsKeys.detail(id) })
    },
  })
}
