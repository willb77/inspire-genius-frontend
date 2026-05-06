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
}
