import { agentApi } from "@/lib/agentApi"

/**
 * S-3: whether Studio may offer the interview-subject picker on this tier.
 * Reads the server's kill switch so the UI hides a control the server would
 * refuse. Not a security check — the backend enforces it on the read.
 */
export async function getStudioInterviewSharingEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/studio-interview-sharing",
  )
  return data?.data?.enabled === true
}
