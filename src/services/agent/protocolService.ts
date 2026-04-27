import { agentApi } from "@/lib/agentApi"

export type InteractionProtocol = {
  protocol: string
  version: number
  active: boolean
  updated_at: string
  /** Agent IDs this protocol applies to. Empty array = all agents. */
  agent_ids: string[]
}

export async function getInteractionProtocol(): Promise<InteractionProtocol> {
  const { data } = await agentApi.get("/v1/agents-settings/interaction-protocol")
  const inner = data.data ?? data
  return {
    protocol: inner.protocol ?? "",
    version: inner.version ?? 1,
    active: inner.active ?? true,
    updated_at: inner.updated_at ?? "",
    agent_ids: inner.agent_ids ?? [],
  }
}

export async function updateInteractionProtocol(
  protocolText: string,
  version?: number,
  agentIds?: string[],
): Promise<{ version: number; updated_at: string }> {
  const { data } = await agentApi.put("/v1/agents-settings/interaction-protocol", {
    protocol_text: protocolText,
    version,
    agent_ids: agentIds,
  })
  // Unwrap the BaseApiResponse envelope: { status, data: { version, updated_at } }
  const inner = data.data ?? data
  return { version: inner.version, updated_at: inner.updated_at }
}
