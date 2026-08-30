import { agentApi } from "@/lib/agentApi"
import type { AwardLetter, GrantApiResponse } from "@/types/grant"

/** GET /v1/agents/grant/award-letters — parsed award letters for offer comparison. */
export async function getAwardLetters(studentId?: string) {
  const { data } = await agentApi.get<GrantApiResponse<AwardLetter[]>>("/v1/agents/grant/award-letters", {
    params: studentId ? { student_id: studentId } : undefined,
  })
  return data
}
