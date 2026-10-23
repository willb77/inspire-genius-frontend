import { agentApi } from "@/lib/agentApi"

/**
 * HOME-1: whether Home shows the "What we know about you" panel on this tier
 * (agent-engine `home_about_you_panel`, default off, no row on any tier until
 * one is written). Not a security check: the panel only offers uploads the
 * person can already reach from Home's Personal Info menu.
 */
export async function getHomeAboutYouPanelEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/home-about-you-panel",
  )
  return data?.data?.enabled === true
}
