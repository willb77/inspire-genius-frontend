import { agentApi } from "@/lib/agentApi"

/**
 * Whether the Practitioner Programme is switched on for this tier.
 *
 * Reads the server's kill switch so the UI can hide a control whose every
 * submission would be refused. It is NOT a security check — each backend
 * route enforces the switch itself.
 */
export async function getPractitionerProgrammeEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
    "/v1/agents/switches/practitioner-programme",
  )
  return data?.data?.enabled === true
}
