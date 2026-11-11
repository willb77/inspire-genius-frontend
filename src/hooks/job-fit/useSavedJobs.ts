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
