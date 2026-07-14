import { api } from "@/lib/axios"
import type {
  CoachActivityRow,
  CoachHome,
  CoachRecord,
  HonorApiResponse,
  HonorFellow,
  ScheduleEvent,
  ScheduleView,
  TeamRecord,
} from "@/types/honor"

/**
 * Honor Foundation Coach Workbench — service layer (thin axios wrappers).
 *
 * These target the NET-NEW coach-scoped endpoints described in the wiring plan
 * (`/v1/coach/*`) and are dormant behind `USE_HONOR_MOCKS` until that backend is
 * built. All list endpoints are JWT-scoped to the signed-in coach's assigned
 * members server-side (`require_member_ownership`); the frontend never filters
 * ownership itself.
 */

/** GET /v1/coach/home — single JWT-scoped dashboard hydration. */
export async function getCoachHome() {
  const { data } = await api.get<HonorApiResponse<CoachHome>>("/v1/coach/home")
  return data
}

/** GET /v1/coach/members — the coach's assigned caseload. */
export async function getCaseload() {
  const { data } = await api.get<HonorApiResponse<HonorFellow[]>>("/v1/coach/members")
  return data
}

/** GET /v1/coach/member/{id} — one assigned member (403 if not assigned). */
export async function getFellow(id: string) {
  const { data } = await api.get<HonorApiResponse<HonorFellow>>(`/v1/coach/member/${id}`)
  return data
}

/** GET /v1/coach/schedule?view=… — the coach's calendar events. */
export async function getCoachSchedule(view: ScheduleView) {
  const { data } = await api.get<HonorApiResponse<ScheduleEvent[]>>("/v1/coach/schedule", {
    params: { view },
  })
  return data
}

/** GET /v1/audit/logs — JWT-scoped coach activity feed. */
export async function getCoachActivity() {
  const { data } = await api.get<HonorApiResponse<CoachActivityRow[]>>("/v1/audit/logs")
  return data
}

/** GET /v1/coach/team — coaches + teams for the administration surface. */
export async function getCoaches() {
  const { data } = await api.get<HonorApiResponse<CoachRecord[]>>("/v1/coach/team/coaches")
  return data
}

export async function getTeams() {
  const { data } = await api.get<HonorApiResponse<TeamRecord[]>>("/v1/coach/team/teams")
  return data
}
