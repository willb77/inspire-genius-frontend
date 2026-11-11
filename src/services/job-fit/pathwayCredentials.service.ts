import { agentApi } from "@/lib/agentApi"
import type { BlueprintPrograms, LocalKind, LocalRead } from "@/types/job-fit/pathway"

/**
 * JF-9 — where a pathway job's training and credentials come from, read on the
 * Pathway page only when the person opens a job's "Training and credentials".
 * Both are agent-engine routes, so they go through `agentApi` under
 * `/v1/agents/…` (the only prefix API Gateway routes to the engine). Nothing
 * here sends a person's data: an occupation code, or a blueprint id.
 */
type Envelope<T> = { status: boolean; data: T }

/** OD-5 — CareerOneStop listings for one occupation. `off` unless job_fit_v2 applies. */
export async function getOccupationLocal(code: string, kind: LocalKind): Promise<LocalRead> {
  const { data } = await agentApi.get<Envelope<LocalRead>>(
    `/v1/agents/occupations/${encodeURIComponent(code)}/local/${kind}`,
  )
  return data.data
}

/**
 * CUR — published school programmes linked to this job's blueprint (or an
 * earlier version of it). Entitlement- and switch-gated on the server: 403/404
 * when the person cannot see them, which the page says rather than hides.
 */
export async function getBlueprintPrograms(blueprintId: string): Promise<BlueprintPrograms> {
  const { data } = await agentApi.get<Envelope<BlueprintPrograms>>(
    `/v1/agents/career-discovery/curriculum/blueprints/${encodeURIComponent(blueprintId)}/programs`,
  )
  return data.data
}
