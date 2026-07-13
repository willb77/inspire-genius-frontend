// GRANT vertical — Coach roster service (raw agentApi calls).
//
// Mirrors intake.service.ts: all HTTP goes through the shared `agentApi`
// instance, every endpoint returns the `{ status, data }` GrantApiResponse
// envelope, and each function returns the unwrapped `data`.

import { agentApi } from "@/lib/agentApi"
import type { GrantApiResponse } from "@/types/grant"
import type {
  CoachImportResult,
  CoachStudent,
  CoachStudentCreate,
  CoachStudentImportRow,
  InviteStudentResult,
  RemoveStudentResult,
} from "@/types/grant/coach"

const BASE = "/v1/agents/grant/coach/students"

/** GET /coach/students — the coach's managed roster. */
export async function listCoachStudents(): Promise<CoachStudent[]> {
  const { data } = await agentApi.get<GrantApiResponse<CoachStudent[]>>(BASE)
  return data.data ?? []
}

/** POST /coach/students — add a single student. */
export async function createCoachStudent(input: CoachStudentCreate): Promise<CoachStudent> {
  const { data } = await agentApi.post<GrantApiResponse<CoachStudent>>(BASE, input)
  return data.data as CoachStudent
}

/** POST /coach/students/import — bulk import parsed CSV rows. */
export async function importCoachStudents(
  rows: CoachStudentImportRow[]
): Promise<CoachImportResult> {
  const { data } = await agentApi.post<GrantApiResponse<CoachImportResult>>(`${BASE}/import`, {
    rows,
  })
  return data.data as CoachImportResult
}

/** DELETE /coach/students/{id} — remove a student from the roster. */
export async function removeCoachStudent(id: string): Promise<RemoveStudentResult> {
  const { data } = await agentApi.delete<GrantApiResponse<RemoveStudentResult>>(
    `${BASE}/${encodeURIComponent(id)}`
  )
  return data.data as RemoveStudentResult
}

/** POST /coach/students/{id}/invite — email the student their own IG login. */
export async function inviteCoachStudent(id: string): Promise<InviteStudentResult> {
  const { data } = await agentApi.post<GrantApiResponse<InviteStudentResult>>(
    `${BASE}/${encodeURIComponent(id)}/invite`
  )
  return data.data as InviteStudentResult
}
