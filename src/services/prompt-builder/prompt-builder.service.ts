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
  const { data } = await api.get<PromptListResponse>("/v1/admin/prompts")
  return data
}

export async function savePrompt(payload: SavePromptPayload) {
  const { data } = await api.post<PromptResponse>("/v1/admin/prompts", payload)
  return data
}

export async function updatePrompt(id: string, payload: SavePromptPayload) {
  const { data } = await api.put<PromptResponse>(`/v1/admin/prompts/${encodeURIComponent(id)}`, payload)
  return data
}

export async function getPromptVersions(coachId: string) {
  // Backend uses agent_id query param on the list endpoint for filtering
  const { data } = await api.get<PromptVersionResponse>("/v1/admin/prompts", {
    params: { agent_id: coachId },
  })
  // Map the list response to version format expected by the hook
  if (data?.data && "prompts" in data.data) {
    return {
      ...data,
      data: { versions: (data.data as PromptListData).prompts },
    } as PromptVersionResponse
  }
  return data
}
