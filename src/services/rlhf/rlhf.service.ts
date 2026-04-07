import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type { RlhfModelsListData, RlhfModelRecord, RlhfModelApprovalPayload } from "@/types/rlhf"

export type RlhfModelsResponse = BaseApiResponse<RlhfModelsListData>
export type RlhfModelResponse = BaseApiResponse<RlhfModelRecord>
export type RlhfApprovalResponse = BaseApiResponse<{ model_id: string; status: string }>

export async function getRlhfModels(limit: number = 50) {
  const { data } = await api.get<RlhfModelsResponse>("/v1/rlhf/models", { params: { limit } })
  return data
}

export async function getRlhfModel(modelId: string) {
  const { data } = await api.get<RlhfModelResponse>(`/v1/rlhf/models/${modelId}`)
  return data
}

export async function approveRlhfModel(modelId: string, payload: RlhfModelApprovalPayload) {
  const { data } = await api.post<RlhfApprovalResponse>(`/v1/rlhf/models/${modelId}/approve`, payload)
  return data
}
