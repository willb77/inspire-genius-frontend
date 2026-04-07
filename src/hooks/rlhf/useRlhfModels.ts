import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type { AxiosError } from "axios"
import {
  getRlhfModels,
  getRlhfModel,
  approveRlhfModel,
  type RlhfModelsResponse,
  type RlhfModelResponse,
  type RlhfApprovalResponse,
} from "@/services/rlhf/rlhf.service"
import type { RlhfModelApprovalPayload } from "@/types/rlhf"
import type { BaseApiResponse } from "@/types/api"
import { toast } from "sonner"

const QK = {
  models: (limit: number) => ["rlhf", "models", limit] as const,
  model: (id: string) => ["rlhf", "model", id] as const,
}

export function useRlhfModels(limit: number = 50) {
  return useQuery<RlhfModelsResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.models(limit),
    queryFn: () => getRlhfModels(limit),
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useRlhfModel(modelId: string) {
  return useQuery<RlhfModelResponse, AxiosError<BaseApiResponse<null>>>({
    queryKey: QK.model(modelId),
    queryFn: () => getRlhfModel(modelId),
    enabled: !!modelId,
    staleTime: 10 * 1000,
  })
}

export function useApproveRlhfModel() {
  const queryClient = useQueryClient()

  return useMutation<
    RlhfApprovalResponse,
    AxiosError<BaseApiResponse<null>>,
    { modelId: string; payload: RlhfModelApprovalPayload }
  >({
    mutationFn: ({ modelId, payload }) => approveRlhfModel(modelId, payload),
    onSuccess: (_resp, { modelId }) => {
      toast.success(`Model ${modelId.slice(0, 8)} approved`)
      queryClient.invalidateQueries({ queryKey: ["rlhf"], exact: false })
    },
    onError: (error) => {
      const msg = error.response?.data?.message || "Failed to approve model"
      toast.error(msg)
    },
  })
}
