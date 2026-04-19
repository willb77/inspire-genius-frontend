import { agentApi } from "@/lib/agentApi"

export type InteractionProtocol = {
  protocol: string
  version: number
  active: boolean
  updated_at: string
}

export async function getInteractionProtocol(): Promise<InteractionProtocol> {
  const { data } = await agentApi.get("/v1/agents-settings/interaction-protocol")
  return data.data
}

export async function updateInteractionProtocol(
  protocolText: string,
  version?: number,
): Promise<{ success: boolean; version: number }> {
  const { data } = await agentApi.put("/v1/agents-settings/interaction-protocol", {
    protocol_text: protocolText,
    version,
  })
  return data
}
