/**
 * Task-agent service — wraps the monolith proxy routes from Combined Plan §A.E3.3.
 *
 * Each function POSTs a structured request to /v1/tasks/<task-slug> and
 * returns the agent-engine TaskAgentResponse.
 */
import { api } from '@/lib/axios'

// ─── Shared response shape ────────────────────────────────────────

export interface TaskAgentResponse {
  agent_name: string
  content: string
  confidence: number
  suggested_next: string | null
  metadata: Record<string, unknown>
}

// ─── Per-task request bodies ──────────────────────────────────────

export interface InterviewPrepRequest {
  company_name: string
  industry: string
  role_title: string
  candidate_name?: string
  interview_focus?: string
  session_id?: string
}

export interface JobBlueprintMatchRequest {
  role_title: string
  company_name: string
  role_responsibilities: string
  candidate_summary: string
  desired_outcomes?: string
  session_id?: string
}

export interface TeamCompositionRequest {
  team_name: string
  team_purpose: string
  member_summaries: string[]
  target_skills?: string[]
  session_id?: string
}

export interface OnboardingFlowRequest {
  new_hire_name: string
  new_hire_role: string
  company_name: string
  company_culture_notes?: string
  week_number?: number
  session_id?: string
}

export interface DocumentResearchRequest {
  question: string
  document_filter_tags?: string[]
  summarize_only?: boolean
  session_id?: string
}

// ─── Save-to-workspace types ──────────────────────────────────────

export interface SaveTaskResultRequest {
  task_slug: string
  agent_id: string
  request_payload: Record<string, unknown>
  result_payload: Record<string, unknown>
  confidence?: number
  title?: string
  note?: string
}

export interface SavedTaskResultRow {
  id: string
  task_slug: string
  agent_id: string
  title: string | null
  confidence: number | null
  created_at: string
}

export interface SavedTaskResultDetail extends SavedTaskResultRow {
  request_payload: Record<string, unknown>
  result_payload: Record<string, unknown>
  note: string | null
}

export interface SavedTaskResultsList {
  status: boolean
  total: number
  data: SavedTaskResultRow[]
}

// ─── API calls ────────────────────────────────────────────────────

const BASE = '/v1/tasks'

export const tasksService = {
  jobBlueprint: (body: JobBlueprintMatchRequest) =>
    api
      .post<TaskAgentResponse>(`${BASE}/job-blueprint`, body)
      .then((r) => r.data),

  interviewPrep: (body: InterviewPrepRequest) =>
    api
      .post<TaskAgentResponse>(`${BASE}/interview-prep`, body)
      .then((r) => r.data),

  teamComposition: (body: TeamCompositionRequest) =>
    api
      .post<TaskAgentResponse>(`${BASE}/team-composition`, body)
      .then((r) => r.data),

  onboarding: (body: OnboardingFlowRequest) =>
    api
      .post<TaskAgentResponse>(`${BASE}/onboarding`, body)
      .then((r) => r.data),

  documentResearch: (body: DocumentResearchRequest) =>
    api
      .post<TaskAgentResponse>(`${BASE}/document-research`, body)
      .then((r) => r.data),

  saveResult: (body: SaveTaskResultRequest) =>
    api
      .post<SavedTaskResultRow>(`${BASE}/results`, body)
      .then((r) => r.data),

  /**
   * List the caller's own saved task results.
   *
   * Agent-engine returns `{ status, total, data: [...] }`. The monolith
   * (rollback path) returned a bare array of rows. We accept either
   * shape so the page works regardless of which API Gateway route wins
   * during a partial rollout.
   */
  listResults: (params?: { task_slug?: string; limit?: number; offset?: number }) =>
    api
      .get<SavedTaskResultsList | SavedTaskResultRow[]>(`${BASE}/results`, { params })
      .then((r) => {
        const payload = r.data
        if (Array.isArray(payload)) {
          return { status: true, total: payload.length, data: payload } as SavedTaskResultsList
        }
        return payload
      }),

  getResult: (id: string) =>
    api
      .get<SavedTaskResultDetail>(`${BASE}/results/${id}`)
      .then((r) => r.data),

  deleteResult: (id: string) =>
    api
      .delete<void>(`${BASE}/results/${id}`)
      .then(() => undefined),
}
