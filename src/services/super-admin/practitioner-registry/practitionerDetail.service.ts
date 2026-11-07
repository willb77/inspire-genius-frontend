import { agentApi } from "@/lib/agentApi"
import type { PractitionerDetail } from "@/types/practitioner-registry-detail"

/**
 * PI-6 (partial): the super-admin practitioner detail drawer's counts.
 *
 * `agentApi`, not the monolith `api` — the route lives on the agent-engine under
 * `/v1/agents/{proxy+}`, behind the same super-admin gate as the rest of the registry.
 */
const BASE = "/v1/agents/practitioner-registry"

type Envelope<T> = { status: boolean; data: T }

export async function getPractitionerDetail(practitionerSub: string): Promise<PractitionerDetail> {
  const { data } = await agentApi.get<Envelope<PractitionerDetail>>(
    `${BASE}/${encodeURIComponent(practitionerSub)}/detail`,
  )
  return data.data
}
