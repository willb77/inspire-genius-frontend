import { agentApi } from "@/lib/agentApi"

/**
 * Careers and Jobs Phase B — is the phase strip on for this person (the
 * `careers_jobs_flow` switch)? The server reads it per person (tier-wide or the
 * person's org) and answers every entitlement combination. Not a security
 * check: the strip only links to pages that enforce their own gates.
 */
const PREFIX = "/v1/agents/careers-jobs"
type Envelope<T> = { status: boolean; data: T }

export async function getCareersJobsFlowEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<Envelope<{ enabled?: unknown }>>(`${PREFIX}/status`)
  return data?.data?.enabled === true
}
