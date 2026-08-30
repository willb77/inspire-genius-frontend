import { agentApi } from "@/lib/agentApi"
import type { Deadline, GrantApiResponse } from "@/types/grant"

/** GET /v1/agents/grant/deadlines — federal/state/institutional/scholarship deadlines. */
export async function getDeadlines(studentId?: string) {
  const { data } = await agentApi.get<GrantApiResponse<Deadline[]>>("/v1/agents/grant/deadlines", {
    params: studentId ? { student_id: studentId } : undefined,
  })
  return data
}
