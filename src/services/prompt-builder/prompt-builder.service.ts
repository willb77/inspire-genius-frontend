import { api } from "@/lib/axios"
import type { BaseApiResponse } from "@/types/api"
import type {
  SavePromptPayload,
  SystemPrompt,
  PromptVersionData,
} from "@/types/prompt-builder"

export type PromptResponse = BaseApiResponse<SystemPrompt>
export type PromptListResponse = BaseApiResponse<{ items: SystemPrompt[]; total: number }>
export type PromptVersionResponse = BaseApiResponse<PromptVersionData>

/**
 * Assemble structured prompt fields into a single template_text string
 * that the backend stores as the prompt content.
 */
function assembleTemplateText(payload: SavePromptPayload): string {
  const sections: string[] = []
  if (payload.persona) sections.push(`## Persona\n${payload.persona}`)
  if (payload.tone) sections.push(`## Tone\n${payload.tone}`)
  if (payload.knowledge_domain) sections.push(`## Knowledge Domain\n${payload.knowledge_domain}`)
  if (payload.response_style) sections.push(`## Response Style\n${payload.response_style}`)
  if (payload.constraints) sections.push(`## Constraints\n${payload.constraints}`)
  return sections.join("\n\n")
}

/**
 * Parse a template_text string back into structured fields.
 */
function parseTemplateText(text: string): Partial<SavePromptPayload> {
  const result: Partial<SavePromptPayload> = { persona: "", tone: "", knowledge_domain: "", response_style: "", constraints: "" }
  const sectionMap: Record<string, keyof SavePromptPayload> = {
    "persona": "persona",
    "tone": "tone",
    "knowledge domain": "knowledge_domain",
    "response style": "response_style",
    "constraints": "constraints",
  }
  const parts = text.split(/^## /m).filter(Boolean)
  for (const part of parts) {
    const newlineIdx = part.indexOf("\n")
    if (newlineIdx === -1) continue
    const heading = part.slice(0, newlineIdx).trim().toLowerCase()
    const body = part.slice(newlineIdx + 1).trim()
    const key = sectionMap[heading]
    if (key) (result as Record<string, string>)[key] = body
  }
  // If no sections found, put everything in persona
  if (!result.persona && !result.tone && !result.knowledge_domain && !result.response_style && !result.constraints) {
    result.persona = text
  }
  return result
}

export async function getPrompts() {
  const { data } = await api.get<PromptListResponse>("/v1/admin/prompts")
  return data
}

export async function savePrompt(payload: SavePromptPayload) {
  // Backend expects query params: name, template_text, agent_id
  const templateText = assembleTemplateText(payload)
  const { data } = await api.post<PromptResponse>("/v1/admin/prompts", null, {
    params: {
      name: `prompt-${payload.coach_id}`,
      template_text: templateText,
      agent_id: payload.coach_id,
    },
  })
  return data
}

export async function updatePrompt(id: string, payload: SavePromptPayload) {
  // Backend expects query params: template_text
  const templateText = assembleTemplateText(payload)
  const { data } = await api.put<PromptResponse>(`/v1/admin/prompts/${encodeURIComponent(id)}`, null, {
    params: {
      template_text: templateText,
    },
  })
  return data
}

export async function getPromptVersions(coachId: string): Promise<PromptVersionResponse> {
  // Backend returns items in list endpoint filtered by agent_id
  const { data } = await api.get<PromptListResponse>("/v1/admin/prompts", {
    params: { agent_id: coachId },
  })

  // Map backend response to frontend SystemPrompt shape
  const items = data?.data?.items ?? []
  const versions: SystemPrompt[] = items.map((item: Record<string, unknown>) => {
    const templateText = (item.template_text as string) || ""
    const parsed = parseTemplateText(templateText)
    return {
      id: item.id as string,
      coach_id: (item.agent_id as string) || coachId,
      version: (item.version as number) || 1,
      persona: parsed.persona || "",
      tone: parsed.tone || "",
      knowledge_domain: parsed.knowledge_domain || "",
      response_style: parsed.response_style || "",
      constraints: parsed.constraints || "",
      assembled_prompt: templateText,
      created_at: (item.created_at as string) || "",
    }
  })

  return {
    ...data,
    data: { versions },
  } as PromptVersionResponse
}

export { parseTemplateText, assembleTemplateText }
