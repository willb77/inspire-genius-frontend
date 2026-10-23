import { useQuery } from "@tanstack/react-query"
import { getWorkspaceDirectionSettingEnabled } from "@/services/switches/workspaceDirectionSetting.service"

/**
 * WS-1 — `true` only when the server says `workspace_direction_setting` is on.
 * Fails closed: loading, an error (including the 404 before the agent-engine
 * route deploys) and "off" all read as `false`, so every menu and the Tools
 * catalogue stay exactly as they are until the switch row exists.
 */
export function useWorkspaceDirectionSettingEnabled(): boolean {
  const q = useQuery({
    queryKey: ["switches", "workspace-direction-setting"],
    queryFn: getWorkspaceDirectionSettingEnabled,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return q.data === true
}
