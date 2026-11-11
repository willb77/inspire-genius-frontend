import { agentApi } from "@/lib/agentApi"
import type { LocalListing, LocalQuery } from "@/lib/career-discovery/learningSection"
import type { VerticalApiResponse } from "@/verticals/core"

// JF-10: Discovery's routes live on the Agent Engine at /v1/agents/career-discovery
// — the only prefix API Gateway routes there — so they go through `agentApi`.
const PREFIX = "/v1/agents/career-discovery"

/**
 * Training providers, licences or apprenticeships for one occupation in one
 * state (CareerOneStop, via the server). The state is used for the lookup and
 * is not stored.
 */
export async function getLearningLocal(q: LocalQuery) {
  const { data } = await agentApi.get<VerticalApiResponse<LocalListing>>(`${PREFIX}/education/local`, {
    params: { soc: q.soc, kind: q.kind, state: q.state },
  })
  return data
}
