import { agentApi } from "@/lib/agentApi"
import type {
  ComponentsJobIn,
  FitComponentsResponse,
  GoalsWiring,
} from "@/types/job-fit/components"

/**
 * Feeds Phase 2 — agent engine, enveloped (`{status, data}`). The fit score sent
 * here is the one blueprint-service already showed the person; the engine only
 * reads it to compose the composite and never changes it.
 */
export async function getFitComponents(jobs: ComponentsJobIn[]): Promise<FitComponentsResponse> {
  const { data } = await agentApi.post<{ status: boolean; data: FitComponentsResponse }>(
    "/v1/agents/job-fit/components",
    { jobs: jobs.slice(0, 50) },
  )
  return data.data
}

/** Goals Studio Overview — "Your goals and your wiring". */
export async function getGoalsWiring(): Promise<GoalsWiring> {
  const { data } = await agentApi.get<{ status: boolean; data: GoalsWiring }>(
    "/v1/agents/goals/wiring",
  )
  return data.data
}
