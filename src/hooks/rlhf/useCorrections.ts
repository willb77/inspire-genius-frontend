import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getCorrections,
  getCorrectionStats,
  approveCorrection,
  rejectCorrection,
  type CorrectionListResponse,
  type CorrectionStatsResponse,
} from "@/services/rlhf/corrections.service"
import type { BaseApiResponse } from "@/types/api"
import { toast } from "sonner"

const QK = {
  list: (params: Record<string, unknown>) => ["rlhf", "corrections", params] as const,
  stats: () => ["rlhf", "corrections", "stats"] as const,
}

export function useCorrections(params: { status?: string; agent_id?: string; limit?: number } = {}) {
  return useQuery<CorrectionListResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.list(params),
    queryFn: () => getCorrections(params),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useCorrectionStats() {
  return useQuery<CorrectionStatsResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.stats(),
    queryFn: () => getCorrectionStats(),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useApproveCorrection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ correctionId, approvedBy }: { correctionId: string; approvedBy: string }) =>
      approveCorrection(correctionId, approvedBy),
    onSuccess: () => {
      toast.success("Correction approved")
      qc.invalidateQueries({ queryKey: ["rlhf", "corrections"], exact: false })
    },
    onError: (err: AxiosError<BaseApiResponse<null>>) => {
      toast.error(err.response?.data?.message || "Failed to approve correction")
    },
  })
}

export function useRejectCorrection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ correctionId, rejectedBy, reason }: { correctionId: string; rejectedBy: string; reason: string }) =>
      rejectCorrection(correctionId, rejectedBy, reason),
    onSuccess: () => {
      toast.success("Correction rejected")
      qc.invalidateQueries({ queryKey: ["rlhf", "corrections"], exact: false })
    },
    onError: (err: AxiosError<BaseApiResponse<null>>) => {
      toast.error(err.response?.data?.message || "Failed to reject correction")
    },
  })
}
