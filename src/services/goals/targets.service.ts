import { agentApi } from "@/lib/agentApi"
import type {
  GoalTarget,
  GoalTargetWithRoadmap,
  MakeTargetIn,
  MakeTargetOut,
  RoadmapRecord,
} from "@/types/goals/targets"

const PREFIX = "/v1/agents/goal-targets"
type Envelope<T> = { status: boolean; data: T }

/** "Make this my target" — aim a goal at a Job Fit role and build its roadmap. */
export async function makeTarget(body: MakeTargetIn): Promise<MakeTargetOut> {
  const { data } = await agentApi.post<Envelope<MakeTargetOut>>(PREFIX, body)
  return data.data
}

export async function getMyTargets(): Promise<GoalTargetWithRoadmap[]> {
  const { data } = await agentApi.get<Envelope<{ targets: GoalTargetWithRoadmap[] }>>(
    `${PREFIX}/mine`,
  )
  return data.data.targets
}

export async function getRoadmap(
  goalId: string,
): Promise<{ target: GoalTarget; roadmap: RoadmapRecord | null }> {
  const { data } = await agentApi.get<
    Envelope<{ target: GoalTarget; roadmap: RoadmapRecord | null }>
  >(`${PREFIX}/${encodeURIComponent(goalId)}/roadmap`)
  return data.data
}

/** Rebuild from the stored fit and the goal as it reads now; supersedes. */
export async function rebuildRoadmap(
  goalId: string,
): Promise<{ target: GoalTarget; roadmap: RoadmapRecord }> {
  const { data } = await agentApi.post<Envelope<{ target: GoalTarget; roadmap: RoadmapRecord }>>(
    `${PREFIX}/${encodeURIComponent(goalId)}/roadmap`,
  )
  return data.data
}

/** Stop aiming the goal at the role. The goal itself stays. */
export async function removeTarget(goalId: string): Promise<{ goalId: string; removed: boolean }> {
  const { data } = await agentApi.delete<Envelope<{ goalId: string; removed: boolean }>>(
    `${PREFIX}/${encodeURIComponent(goalId)}`,
  )
  return data.data
}
