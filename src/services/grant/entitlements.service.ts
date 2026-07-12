import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse } from "@/types/grant"

/**
 * GET /v1/agents/me/verticals — the current user's enabled vertical packs.
 *
 * Served by the agent-engine (app/routes/entitlements.py) under /v1/agents/*
 * so it rides the working API Gateway integration. This is the authoritative
 * server read behind {@link useVerticalAccess}.
 */
export async function getEnabledVerticals() {
  const { data } = await agentApi.get<GrantApiResponse<{ enabled_verticals?: string[] }>>(
    "/v1/agents/me/verticals"
  )
  return data
}
