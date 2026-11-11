import { agentApi } from "@/lib/agentApi"
import type { SkillMatch } from "@/types/job-fit/skillMatch"

/**
 * JF-12 — skills match. The server takes the owner from the token, so nothing
 * here ever sends a user id; the only parameter is the job's O*NET code.
 */
type Envelope<T> = { status: boolean; data: T }

/** Whether Skills (and so the match) is on for this person — JF-11's status
 * route, the same `job_fit_v2` switch. Not a security check: the match route
 * refuses itself while it is off. */
export async function getSkillMatchEnabled(): Promise<boolean> {
  const { data } = await agentApi.get<Envelope<{ enabled?: unknown }>>("/v1/agents/me/skills/status")
  return data?.data?.enabled === true
}

export async function getSkillMatch(onetSocCode: string): Promise<SkillMatch> {
  const { data } = await agentApi.get<Envelope<SkillMatch>>("/v1/agents/me/skill-match", {
    params: { onet: onetSocCode },
  })
  return data.data
}
