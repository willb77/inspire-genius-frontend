import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse, StudentProfile } from "@/types/grant"

/** GET /v1/agents/grant/students/{id} — fetch a student's financial-aid profile. */
export async function getStudentProfile(studentId: string) {
  const { data } = await agentApi.get<GrantApiResponse<StudentProfile>>(
    `/v1/agents/grant/students/${encodeURIComponent(studentId)}`
  )
  return data
}
