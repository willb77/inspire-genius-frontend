import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse } from "@/types/grant"
import type { AidIntakePayload } from "@/types/grant/intake"

/**
 * GET /v1/agents/grant/students/{id}/aid-intake — fetch the saved aid-intake profile.
 * Returns the nested backend IntakeProfile shape (screener/modules/core); the
 * hook maps it into the flat form shape via fromIntakePayload.
 */
export async function getAidIntake(studentId: string) {
  const { data } = await agentApi.get<GrantApiResponse<AidIntakePayload>>(
    `/v1/agents/grant/students/${encodeURIComponent(studentId)}/aid-intake`
  )
  return data
}

/**
 * PATCH /v1/agents/grant/students/{id}/aid-intake — persist the aid-intake profile.
 * Takes the nested IntakeProfile payload (built by toIntakePayload) and writes it
 * onto the ig_student_profile financial_intake blob (the write-allowlisted field).
 */
export async function saveAidIntake(studentId: string, payload: AidIntakePayload) {
  const { data } = await agentApi.patch<GrantApiResponse<AidIntakePayload>>(
    `/v1/agents/grant/students/${encodeURIComponent(studentId)}/aid-intake`,
    payload
  )
  return data
}
