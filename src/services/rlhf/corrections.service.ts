import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"

export type CorrectionEntry = {
  correction_id: string
  agent_id: string
  query_text: string
  original_response: string
  corrected_response: string
  submitted_by: string
  status: "pending" | "approved" | "rejected"
  created_at: string
  approved_at?: string
  approved_by?: string
  rejected_at?: string
  rejected_by?: string
  rejection_reason?: string
}

export type CorrectionListData = {
  corrections: CorrectionEntry[]
  count: number
}

export type CorrectionStatsData = {
  pending: number
  approved: number
  rejected: number
  total: number
}

export type CorrectionListResponse = BaseApiResponse<CorrectionListData>
export type CorrectionStatsResponse = BaseApiResponse<CorrectionStatsData>

export async function getCorrections(params: {
  status?: string
  agent_id?: string
  limit?: number
} = {}): Promise<CorrectionListResponse> {
  const { data } = await api.get<CorrectionListResponse>("/v1/rlhf/corrections", {
    params: { status_filter: params.status, agent_id: params.agent_id, limit: params.limit ?? 50 },
  })
  return data
}

export async function getCorrectionStats(): Promise<CorrectionStatsResponse> {
  const { data } = await api.get<CorrectionStatsResponse>("/v1/rlhf/corrections/stats")
  return data
}

export async function approveCorrection(correctionId: string, approvedBy: string) {
  const { data } = await api.post(`/v1/rlhf/corrections/${correctionId}/approve`, {
    approved_by: approvedBy,
  })
  return data
}

export async function rejectCorrection(correctionId: string, rejectedBy: string, reason: string) {
  const { data } = await api.post(`/v1/rlhf/corrections/${correctionId}/reject`, {
    rejected_by: rejectedBy,
    reason,
  })
  return data
}
