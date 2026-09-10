import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import { toast } from "sonner"
import { fitService } from "@/services/job-fit/fit.service"
import type { FitSnapshot, FitSnapshotSaveBody, FitSnapshotSummary } from "@/types/job-fit"

export const FIT_HISTORY_KEY = ["job-fit", "history"] as const

/**
 * The person's own fit history (GET /v1/blueprint/fit/history) — every fit
 * read they made (newest 20) plus their explicit saves. Written server-side
 * on each read, so this is real and needs no client bookkeeping.
 */
export function useFitHistory(options?: Partial<UseQueryOptions<FitSnapshotSummary[], AxiosError>>) {
  return useQuery<FitSnapshotSummary[], AxiosError>({
    queryKey: FIT_HISTORY_KEY,
    queryFn: async () => {
      const res = await fitService.getHistory()
      return res.data.data ?? []
    },
    ...options,
  })
}

/** One of the person's own rows with the response as it was served. */
export function useFitSnapshot(snapshotId: string | undefined) {
  return useQuery<FitSnapshot, AxiosError>({
    queryKey: [...FIT_HISTORY_KEY, "snapshot", snapshotId],
    queryFn: async () => {
      const res = await fitService.getSnapshot(snapshotId as string)
      const data = res.data.data
      if (!data) throw new Error("No snapshot returned from the server")
      return data
    },
    enabled: Boolean(snapshotId),
    retry: (count, err) => err.response?.status !== 404 && count < 2,
  })
}

/**
 * "Save to your fit reports" (POST /v1/blueprint/fit/history). Invalidates
 * the history list so the panel shows the row at once. Failures toast — the
 * old localStorage path reported success without persisting anything real.
 */
export function useSaveFitReport() {
  const qc = useQueryClient()
  return useMutation<FitSnapshotSummary, AxiosError, FitSnapshotSaveBody>({
    mutationFn: async (body) => {
      const res = await fitService.saveSnapshot(body)
      const data = res.data.data
      if (!data) throw new Error("No snapshot returned from the server")
      return data
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: FIT_HISTORY_KEY })
    },
    onError: () => {
      toast.error("Couldn't save this report. Please try again.")
    },
  })
}
