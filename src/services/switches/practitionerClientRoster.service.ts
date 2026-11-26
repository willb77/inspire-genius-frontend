import axios from "axios"

import { agentApi } from "@/lib/agentApi"

/**
 * RM-6 B: whether the practitioner's Client Development Studio lists their
 * clients on this tier: the server's own decision (`tds_practitioner_client_roster`
 * and `practitioner_programme`, the pair growth-service reads).
 *
 * A 404 is OFF: the frontend reaches staging-b on merge, before the engine's
 * status route does (it arrives at the next promote). Not a security check; it
 * only decides which page is the practitioner's front page.
 */
export async function getPractitionerClientRosterEnabled(): Promise<boolean> {
  try {
    const { data } = await agentApi.get<{ status: boolean; data: { enabled?: unknown } }>(
      "/v1/agents/switches/practitioner-client-roster",
    )
    return data?.data?.enabled === true
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) return false
    throw err
  }
}
