import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getSavedJobs,
  getSavedJobsEnabled,
  removeSavedJob,
  saveJob,
} from "@/services/job-fit/savedJobs.service"
import type { SaveJobIn } from "@/types/job-fit/savedJobs"

export const savedJobKeys = {
  enabled: ["saved-jobs", "enabled"] as const,
  mine: ["saved-jobs", "mine"] as const,
}

/** `true` only when the server says Favorites is on for this person. Loading,
 * an error and "off" all read as `false`, so every page renders as today. */
export function useSavedJobsEnabled(): boolean {
  const q = useQuery({
    queryKey: savedJobKeys.enabled,
    queryFn: getSavedJobsEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}

/**
 * The same `job_fit_v2` read, for a page that must not say "off" while the
 * answer is still on its way (TS-4a, Team fit). Same query key and options as
 * {@link useSavedJobsEnabled}, so it costs no second request. An error reads
 * as "off", as it does there.
 */
export function useSavedJobsEnabledStatus(): "loading" | "on" | "off" {
  const q = useQuery({
    queryKey: savedJobKeys.enabled,
    queryFn: getSavedJobsEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  if (q.isLoading) return "loading"
  return q.data === true ? "on" : "off"
}

/** My favorites, newest first. Idle while `enabled` is false. */
export function useSavedJobs(enabled: boolean) {
  return useQuery({
    queryKey: savedJobKeys.mine,
    queryFn: getSavedJobs,
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}

export function useSaveJob() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof saveJob>>, AxiosError, SaveJobIn>({
    mutationFn: saveJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: savedJobKeys.mine }),
  })
}

export function useRemoveSavedJob() {
  const qc = useQueryClient()
  return useMutation<Awaited<ReturnType<typeof removeSavedJob>>, AxiosError, string>({
    mutationFn: removeSavedJob,
    onSuccess: () => qc.invalidateQueries({ queryKey: savedJobKeys.mine }),
  })
}
