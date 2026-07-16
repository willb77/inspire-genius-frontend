import { agentApi } from "@/lib/agentApi"
import { api } from "@/lib/axios"
import type {
  CoachActivityRow,
  CoachHome,
  CoachRecord,
  HonorApiResponse,
  HonorFellow,
  ScheduleEvent,
  TeamRecord,
} from "@/types/honor"

/**
 * Honor Foundation Coach Workbench — service layer (Simplified Vertical Model).
 *
 * Per IG_Vertical_Simplified_Model.docx, a vertical is frontend-only over the
 * UNCHANGED Core: NO new /v1/coach/* service, NO coach_member_assignments table,
 * NO ownership middleware. Every call below targets an EXISTING Core endpoint —
 * the same machinery GRANT and Summit already use. Dormant behind
 * USE_HONOR_MOCKS until each screen is flipped live.
 *
 * Coach roster reuses the GRANT-established agent-engine pattern
 * (src/services/grant/coach.service.ts hits /v1/agents/grant/coach/students*);
 * Honor mirrors it under the "honor" surface. The Evaluate chat reuses the
 * Meridian async-jobs transport (Summit pattern) — see the note on
 * runMemberEvaluation below — not a bespoke DAG.
 */

/** GRANT-style coach roster base in the agent-engine (reuse the same route pattern). */
const COACH_BASE = "/v1/agents/honor/coach/students"

/** Caseload — GET /v1/agents/honor/coach/students (JWT-scoped in the agent-engine, like GRANT). */
export async function getCaseload() {
  const { data } = await agentApi.get<HonorApiResponse<HonorFellow[]>>(COACH_BASE)
  return data
}

/** One assigned fellow — GET /v1/agents/honor/coach/students/{id}. */
export async function getFellow(id: string) {
  const { data } = await agentApi.get<HonorApiResponse<HonorFellow>>(`${COACH_BASE}/${id}`)
  return data
}

/** Add a fellow — POST /v1/agents/honor/coach/students (mirrors GRANT createCoachStudent). */
export async function createFellow(input: Partial<HonorFellow>) {
  const { data } = await agentApi.post<HonorApiResponse<HonorFellow>>(COACH_BASE, input)
  return data
}

/** Bulk CSV import — POST /v1/agents/honor/coach/students/import (mirrors GRANT importCoachStudents). */
export async function importFellows(rows: Array<Record<string, string>>) {
  const { data } = await agentApi.post<HonorApiResponse<{ added: number; updated: number }>>(
    `${COACH_BASE}/import`,
    { rows }
  )
  return data
}

/**
 * Coach home — no bespoke /v1/coach/home service (that would violate the model).
 * The dashboard is composed frontend-side from the roster + activity reads. This
 * wrapper is kept for the hook seam; in the live path the hook composes locally.
 */
export async function getCoachHome() {
  const { data } = await getCaseload()
  const fellows = data ?? []
  const counts = {
    assigned: fellows.length,
    assessed: fellows.filter((f) => f.status === "assessed").length,
    intakePending: fellows.filter((f) => f.status === "intake-pending").length,
  }
  const home: CoachHome = {
    coachName: "",
    coachTitle: "",
    counts,
    recentActivity: [],
    upcomingEvents: [],
  }
  return { data: home } as HonorApiResponse<CoachHome>
}

/**
 * Schedule — frontend-only in the Simplified Model (no bespoke /v1/coach/schedule).
 * Rendered from roster/session data; iCal/Google sync is a deferred Phase-2 stub.
 */
export async function getCoachSchedule() {
  return { data: [] as ScheduleEvent[] } as HonorApiResponse<ScheduleEvent[]>
}

/** Activity feed — reuse existing conversation/audit history (GET /v1/chat/... + audit-service). */
export async function getCoachActivity() {
  const { data } = await api.get<HonorApiResponse<CoachActivityRow[]>>("/v1/chat/history")
  return data
}

/** Administration coach list — reuse the existing team/roster read (dashboard-service). */
export async function getCoaches() {
  const { data } = await api.get<HonorApiResponse<CoachRecord[]>>("/api/manager/team")
  return data
}

export async function getTeams() {
  const { data } = await api.get<HonorApiResponse<TeamRecord[]>>("/api/manager/teams")
  return data
}

/**
 * Evaluate a member — reuse the Meridian async-jobs transport (the Summit pattern),
 * NOT a bespoke DAG. Submit to POST /v1/agents/chat/async with
 * context.surface="honor" so the server routes to the existing agents
 * (Aura/James/Nova/Ascend/Echo/Bridge/Grant) synthesized by Meridian, then poll
 * GET /v1/agents/chat/jobs/{job_id}. Wired in Phase 1 (see src/services/summit/
 * summitChat.ts for the reference implementation).
 */
export async function submitMemberEvaluation(prompt: string, memberId: string) {
  const { data } = await api.post<HonorApiResponse<{ job_id: string }>>("/v1/agents/chat/async", {
    message: prompt,
    context: { surface: "honor", intent: "member_evaluation", member_id: memberId },
  })
  return data
}
