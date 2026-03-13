import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  SavePromptPayload,
  SystemPrompt,
  PromptListData,
  PromptVersionData,
} from "@/types/prompt-builder"

export type PromptResponse = BaseApiResponse<SystemPrompt>
export type PromptListResponse = BaseApiResponse<PromptListData>
export type PromptVersionResponse = BaseApiResponse<PromptVersionData>

export async function getPrompts() {
  const { data } = await api.get<PromptListResponse>("/v1/prompts")
  return data
}

export async function savePrompt(payload: SavePromptPayload) {
  const { data } = await api.post<PromptResponse>("/v1/prompts", payload)
  return data
}

export async function updatePrompt(id: string, payload: SavePromptPayload) {
  const { data } = await api.put<PromptResponse>(`/v1/prompts/${encodeURIComponent(id)}`, payload)
  return data
}

export async function getPromptVersions(coachId: string) {
  const { data } = await api.get<PromptVersionResponse>(`/v1/prompts/${encodeURIComponent(coachId)}/versions`)
  return data
}
