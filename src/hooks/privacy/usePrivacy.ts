import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  deleteUserData,
  exportUserData,
  getDeletionRequests,
  getDeletionManifest,
  triggerRetentionSweep,
  type DeletionResponse,
  type ExportResponse,
  type DeletionRequestsResponse,
  type DeletionManifest,
  type RetentionSweepResponse,
} from "@/services/privacy/privacy.service"

export function useDeleteUserData() {
  const queryClient = useQueryClient()
  return useMutation<DeletionResponse, AxiosError, string>({
    mutationFn: (userId) => deleteUserData(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["privacy", "requests"] })
    },
  })
}

export function useExportUserData() {
  return useMutation<ExportResponse, AxiosError, string>({
    mutationFn: (userId) => exportUserData(userId),
  })
}

export function useDeletionRequests(status?: string, limit = 50) {
  return useQuery<DeletionRequestsResponse, AxiosError>({
    queryKey: ["privacy", "requests", status, limit],
    queryFn: () => getDeletionRequests(status, limit),
  })
}

export function useDeletionManifest(requestId: string | null) {
  return useQuery<{ success: boolean; manifest: DeletionManifest }, AxiosError>({
    queryKey: ["privacy", "manifest", requestId],
    queryFn: () => getDeletionManifest(requestId!),
    enabled: !!requestId,
  })
}

export function useRetentionSweep() {
  return useMutation<RetentionSweepResponse, AxiosError, void>({
    mutationFn: () => triggerRetentionSweep(),
  })
}
