import { agentApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "./types"

/**
 * GET /v1/agents/me/verticals — the current user's enabled vertical packs.
 *
 * Served by the agent-engine (`app/verticals/core/entitlements.py`) and shared
 * by every vertical — a new vertical needs no new endpoint here.
 *
 * Called through `agentApi` (direct-to-agent-engine), not the monolith `api`
 * instance: only `/v1/agents/*` has an API Gateway integration to the engine.
 */
export async function getEnabledVerticals() {
  const { data } = await agentApi.get<
    VerticalApiResponse<{ enabled_verticals?: string[] }>
  >("/v1/agents/me/verticals")
  return data
}
