import { agentApi } from "@/lib/agentApi"
import type { OccupationDetail, OccupationPay, OccupationRead } from "@/types/job-fit/occupations"

/**
 * JF-6 — OD-4's occupation reads. Mounted on the agent-engine at
 * `/v1/agents/occupations` (the only prefix API Gateway routes to the engine),
 * so these go through `agentApi`, never the monolith `api` instance.
 * Published statistics only; nothing here sends a person's data.
 */
const PREFIX = "/v1/agents/occupations"
type Envelope<T> = { status: boolean; data: T }

export async function getOccupation(code: string): Promise<OccupationRead<OccupationDetail>> {
  const { data } = await agentApi.get<Envelope<OccupationRead<OccupationDetail>>>(
    `${PREFIX}/${encodeURIComponent(code)}`,
  )
  return data.data
}

/**
 * Pay where the person is (D13): metro from a ZIP, then state, then national.
 * With no `area` and no `state` the server answers at national level and says so.
 */
export async function getOccupationPay(
  code: string,
  where: { area?: string | null; state?: string | null } = {},
): Promise<OccupationRead<OccupationPay>> {
  const params: Record<string, string> = {}
  if (where.area) params.area = where.area
  if (where.state) params.state = where.state
  const { data } = await agentApi.get<Envelope<OccupationRead<OccupationPay>>>(
    `${PREFIX}/${encodeURIComponent(code)}/pay`,
    { params },
  )
  return data.data
}
