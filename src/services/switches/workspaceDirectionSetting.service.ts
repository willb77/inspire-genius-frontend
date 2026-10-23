import { agentApi } from "@/lib/agentApi"

/**
 * WS-1: whether Direction Setting is listed in My Workspace for entitled
 * accounts on this tier (agent-engine `workspace_direction_setting`, default
 * off, no row on any tier until one is written). Not a security check — it
 * moves a menu row; `VerticalShell` and the server's entitlement gate still
 * decide who can open the vertical.
 */
export async function getWorkspaceDirectionSettingEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/workspace-direction-setting",
  )
  return data?.data?.enabled === true
}
