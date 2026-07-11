import { api } from "@/lib/axios"
import type { GrantApiResponse, StudentProfile } from "@/types/grant"

/** GET /v1/students/{id} — fetch a student's financial-aid profile. */
export async function getStudentProfile(studentId: string) {
  const { data } = await api.get<GrantApiResponse<StudentProfile>>(
    `/v1/students/${encodeURIComponent(studentId)}`
  )
  return data
}
