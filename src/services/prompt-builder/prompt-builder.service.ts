import { getApi } from "@/lib/agentApi"
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

/**
 * Fetch all prompts — uses /v1/agents-settings/agents which is the live endpoint
 * that returns agent data including prompts.  Falls back to /v1/admin/prompts for
 * backward compatibility.
 */
export async function getPrompts(): Promise<PromptListResponse> {
  try {
    const { data } = await getApi().get("/v1/agents-settings/agents", { params: { page: 1, page_size: 100 } })
    // Map agents-settings response to the prompt list shape the frontend expects
    const raw = data as { status?: boolean; data?: { agents?: Array<Record<string, unknown>> } }
    const agents = raw?.data?.agents ?? []
    const items: SystemPrompt[] = agents.map((ag: Record<string, unknown>) => {
      const prompts = ag.prompts as Array<Record<string, unknown>> | undefined
      const promptText = prompts?.[0]?.content as string || prompts?.[0]?.text as string || ""
      const parsed = parseTemplateText(promptText)
      return {
        id: (ag.id as string) || "",
        coach_id: (ag.id as string) || "",
        version: 1,
        persona: parsed.persona || "",
        tone: parsed.tone || "",
        knowledge_domain: parsed.knowledge_domain || "",
        response_style: parsed.response_style || "",
        constraints: parsed.constraints || "",
        assembled_prompt: promptText,
        created_at: (ag.created_at as string) || "",
      }
    })
    return { status: true, data: { items, total: items.length } }
  } catch {
    // Fall back to legacy endpoint
    const { data } = await getApi().get<PromptListResponse>("/v1/admin/prompts")
    return data
  }
}

export async function savePrompt(payload: SavePromptPayload) {
  // Use agents-settings PUT to update the prompt for an agent
  const templateText = assembleTemplateText(payload)
  try {
    const { data } = await getApi().put("/v1/agents-settings/agents", { prompt: templateText }, {
      params: { agent_id: payload.coach_id },
    })
    const resp = data as Record<string, unknown>
    return {
      status: resp.status as boolean,
      message: (resp.message as string) || "Prompt saved",
      data: {
        id: payload.coach_id,
        coach_id: payload.coach_id,
        version: 1,
        persona: payload.persona,
        tone: payload.tone,
        knowledge_domain: payload.knowledge_domain,
        response_style: payload.response_style,
        constraints: payload.constraints,
        assembled_prompt: templateText,
        created_at: new Date().toISOString(),
      },
    } as PromptResponse
  } catch {
    // Fall back to legacy endpoint
    const { data } = await getApi().post<PromptResponse>("/v1/admin/prompts", null, {
      params: {
        name: `prompt-${payload.coach_id}`,
        template_text: templateText,
        agent_id: payload.coach_id,
      },
    })
    return data
  }
}

export async function updatePrompt(id: string, payload: SavePromptPayload) {
  // Use agents-settings PUT to update the prompt for an agent
  // Always use payload.coach_id as the agent_id (id param may be a prompt UUID, not the agent ID)
  const templateText = assembleTemplateText(payload)
  const agentId = payload.coach_id || id
  try {
    const { data } = await getApi().put("/v1/agents-settings/agents", { prompt: templateText }, {
      params: { agent_id: agentId },
    })
    const resp = data as Record<string, unknown>
    return {
      status: resp.status as boolean,
      message: (resp.message as string) || "Prompt updated",
      data: {
        id,
        coach_id: payload.coach_id,
        version: 1,
        persona: payload.persona,
        tone: payload.tone,
        knowledge_domain: payload.knowledge_domain,
        response_style: payload.response_style,
        constraints: payload.constraints,
        assembled_prompt: templateText,
        created_at: new Date().toISOString(),
      },
    } as PromptResponse
  } catch {
    // Fall back to legacy endpoint
    const { data } = await getApi().put<PromptResponse>(`/v1/admin/prompts/${encodeURIComponent(id)}`, null, {
      params: { template_text: templateText },
    })
    return data
  }
}

export async function getPromptVersions(coachId: string): Promise<PromptVersionResponse> {
  // Fetch the specific agent's data from agents-settings which includes prompts
  try {
    const { data } = await getApi().get("/v1/agents-settings/agents", {
      params: { page: 1, page_size: 100 },
    })
    const raw = data as { data?: { agents?: Array<Record<string, unknown>> } }
    const agents = raw?.data?.agents ?? []
    const agent = agents.find((a: Record<string, unknown>) => a.id === coachId)
    if (!agent) {
      return { status: true, data: { versions: [] } }
    }

    const prompts = (agent.prompts as Array<Record<string, unknown>>) ?? []
    const systemPrompt = (agent.system_prompt as string) || ""

    // Map each prompt entry to a SystemPrompt version
    const versions: SystemPrompt[] = prompts.map((p: Record<string, unknown>, idx: number) => {
      const text = (p.content as string) || (p.text as string) || systemPrompt || ""
      const parsed = parseTemplateText(text)
      return {
        id: (p.id as string) || `${coachId}-${idx}`,
        coach_id: coachId,
        version: prompts.length - idx,
        persona: parsed.persona || "",
        tone: parsed.tone || "",
        knowledge_domain: parsed.knowledge_domain || "",
        response_style: parsed.response_style || "",
        constraints: parsed.constraints || "",
        assembled_prompt: text,
        created_at: (p.created_at as string) || "",
      }
    })

    // If no prompt entries but system_prompt exists, create a version from it
    if (versions.length === 0 && systemPrompt) {
      const parsed = parseTemplateText(systemPrompt)
      versions.push({
        id: `${coachId}-system`,
        coach_id: coachId,
        version: 1,
        persona: parsed.persona || "",
        tone: parsed.tone || "",
        knowledge_domain: parsed.knowledge_domain || "",
        response_style: parsed.response_style || "",
        constraints: parsed.constraints || "",
        assembled_prompt: systemPrompt,
        created_at: (agent.created_at as string) || "",
      })
    }

    return { status: true, data: { versions } }
  } catch {
    // Fall back to legacy endpoint
    const { data } = await getApi().get<PromptListResponse>("/v1/admin/prompts", {
      params: { agent_id: coachId },
    })
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
    return { ...data, data: { versions } } as PromptVersionResponse
  }
}

export { parseTemplateText, assembleTemplateText }
