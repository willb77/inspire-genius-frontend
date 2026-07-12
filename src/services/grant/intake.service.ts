import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse } from "@/types/grant"
import type { AidIntakeProfile, PartialAidIntake } from "@/types/grant/intake"

/**
 * GET /v1/students/{id}/aid-intake — fetch the saved aid-intake profile.
 * Returns a partial profile (the student may have answered only some fields).
 */
export async function getAidIntake(studentId: string) {
  const { data } = await agentApi.get<GrantApiResponse<PartialAidIntake>>(
    `/v1/students/${encodeURIComponent(studentId)}/aid-intake`
  )
  return data
}

/**
 * PATCH /v1/students/{id}/aid-intake — persist the aid-intake profile.
 * Maps 1:1 onto the ig_student_profile_update tool's financial_intake write
 * (the write-allowlisted field) once the Section-4 endpoint is live.
 */
export async function saveAidIntake(studentId: string, profile: AidIntakeProfile) {
  const { data } = await agentApi.patch<GrantApiResponse<AidIntakeProfile>>(
    `/v1/students/${encodeURIComponent(studentId)}/aid-intake`,
    profile
  )
  return data
}
