/**
 * Growth-service API wrappers — Team Development Studio data layer.
 *
 * Service layer (Service → Hook → Component). Raw axios calls only, no React.
 * Reached via `getApi()` (agentApi → API Gateway → growth-service) at base
 * path `/v1/growth`. All payloads are camelCase matching `@/types/development`.
 *
 * Responses are wrapped in the `BaseApiResponse<T>` envelope, same as
 * `manager.service.ts`; callers unwrap `res.data?.data`.
 */
import { getApi } from "@/lib/agentApi"
import type { BaseApiResponse } from "@/types/api"
import type {
  BulkMembersResult,
  CareerMatch,
  DevelopmentGap,
  GoalCategoryCoverage,
  LearningItem,
  MemberCreateInput,
  MemberCreateResult,
  MemberDossier,
  Milestone,
  RosterMember,
  SelfPrismResponse,
  SummitGoal,
} from "@/types/development"

const BASE = "/v1/growth"

/** GET /roster → RosterMember[] */
export function getTeamDevelopmentRoster() {
  return getApi().get<BaseApiResponse<RosterMember[]>>(`${BASE}/roster`)
}

/**
 * GET /members/{id}/dossier?refresh=bool.
 *
 * Async compute: the ~60s dossier is never computed synchronously (it would
 * exceed the API Gateway 30s cap). A warm cache returns 200 with the
 * MemberDossier; a cold/computing dossier returns **202** with
 * `{status:"computing", jobId}` and the caller polls until 200. Inspect
 * `res.status` to distinguish (see useMemberDossier).
 */
export function getMemberDossier(memberId: string, refresh = false) {
  return getApi().get<BaseApiResponse<MemberDossier>>(
    `${BASE}/members/${memberId}/dossier`,
    { params: refresh ? { refresh: true } : undefined },
  )
}

/** POST /members/{id}/dossier/recompute → 202 {status:"computing", jobId}. */
export function recomputeDossier(memberId: string) {
  return getApi().post<BaseApiResponse<{ status?: string; jobId?: string }>>(
    `${BASE}/members/${memberId}/dossier/recompute`,
  )
}

export type DevelopmentGoalsResponse = {
  goals: SummitGoal[]
  coverage: GoalCategoryCoverage[]
  goalsPending?: boolean
  prismNeeded?: boolean
}

/** GET /members/{id}/goals → { goals, coverage, goalsPending?, prismNeeded? } */
export function getDevelopmentGoals(memberId: string) {
  return getApi().get<BaseApiResponse<DevelopmentGoalsResponse>>(
    `${BASE}/members/${memberId}/goals`,
  )
}

export type GoalSessionAction = "invite" | "resume"

/** POST /members/{id}/goal-session — invite/resume a Summit discovery session. */
export function postGoalSession(memberId: string, action: GoalSessionAction) {
  return getApi().post<BaseApiResponse<{ sessionId?: string; status?: string }>>(
    `${BASE}/members/${memberId}/goal-session`,
    { action },
  )
}

/** POST /goals/{goalId}/ratify — manager co-ratify / comment (never overwrites member). */
export function ratifyGoal(goalId: string, comment?: string) {
  return getApi().post<BaseApiResponse<SummitGoal>>(`${BASE}/goals/${goalId}/ratify`, {
    comment,
  })
}

/** GET /members/{id}/gaps?target_blueprint_id= → DevelopmentGap[] */
export function getGapAnalysis(memberId: string, targetBlueprintId?: string) {
  return getApi().get<BaseApiResponse<DevelopmentGap[]>>(
    `${BASE}/members/${memberId}/gaps`,
    { params: targetBlueprintId ? { target_blueprint_id: targetBlueprintId } : undefined },
  )
}

export type CreateLearningItemInput = {
  gapId?: string
  goalId?: string
  title: string
  provider?: string
  estHours?: number
  format?: LearningItem["format"]
}

/** POST /members/{id}/learning-items → LearningItem */
export function createLearningItem(memberId: string, input: CreateLearningItemInput) {
  return getApi().post<BaseApiResponse<LearningItem>>(
    `${BASE}/members/${memberId}/learning-items`,
    input,
  )
}

/** GET /members/{id}/milestones → Milestone[] */
export function getMilestones(memberId: string) {
  return getApi().get<BaseApiResponse<Milestone[]>>(
    `${BASE}/members/${memberId}/milestones`,
  )
}

export type CreateMilestoneInput = {
  goalId: string
  title: string
  horizon: Milestone["horizon"]
  dueDate?: string
  sequence?: number
  gapIds?: string[]
  learningItemIds?: string[]
}

/** POST /members/{id}/milestones → Milestone */
export function createMilestone(memberId: string, input: CreateMilestoneInput) {
  return getApi().post<BaseApiResponse<Milestone>>(
    `${BASE}/members/${memberId}/milestones`,
    input,
  )
}

export type UpdateMilestoneInput = {
  milestoneId: string
  status?: Milestone["status"]
  blockedReason?: string
  title?: string
  horizon?: Milestone["horizon"]
  dueDate?: string
}

/** PATCH /members/{id}/milestones → Milestone */
export function updateMilestone(memberId: string, input: UpdateMilestoneInput) {
  return getApi().patch<BaseApiResponse<Milestone>>(
    `${BASE}/members/${memberId}/milestones`,
    input,
  )
}

/** GET /members/{id}/matches?kind=internal|external → CareerMatch[] */
export function getCareerMatches(memberId: string, kind: "internal" | "external") {
  return getApi().get<BaseApiResponse<CareerMatch[]>>(
    `${BASE}/members/${memberId}/matches`,
    { params: { kind } },
  )
}

export type SharePlanInput = {
  message?: string
  includePdf?: boolean
}

/** POST /members/{id}/share — share the plan with the member. */
export function sharePlan(memberId: string, input: SharePlanInput = {}) {
  return getApi().post<BaseApiResponse<{ shared: boolean; sharedAt?: string }>>(
    `${BASE}/members/${memberId}/share`,
    input,
  )
}

// ── Meridian chat persistence (per manager + member) ─────────────────────────

export type DossierChatMessage = {
  role: "user" | "assistant"
  content: string
  createdAt?: string
}

/** GET /members/{id}/chat — persisted Meridian chat so the manager can resume. */
export function getMemberChat(memberId: string) {
  return getApi().get<BaseApiResponse<{ messages: DossierChatMessage[] }>>(
    `${BASE}/members/${memberId}/chat`,
  )
}

/** POST /members/{id}/chat — persist one chat turn (question or reply). */
export function postMemberChat(memberId: string, message: DossierChatMessage) {
  return getApi().post<BaseApiResponse<DossierChatMessage>>(
    `${BASE}/members/${memberId}/chat`,
    { role: message.role, content: message.content },
  )
}

// ── Add team members (single + bulk) ─────────────────────────────────────────

/** POST /members — add a single member under the calling manager. */
export function addTeamMember(input: MemberCreateInput) {
  return getApi().post<BaseApiResponse<MemberCreateResult>>(`${BASE}/members`, input)
}

/** POST /members/bulk — bulk-add members (CSV upload) under the manager. */
export function bulkAddTeamMembers(members: MemberCreateInput[]) {
  return getApi().post<BaseApiResponse<BulkMembersResult>>(`${BASE}/members/bulk`, {
    members,
  })
}

/** DELETE /members/{id} — remove a manager-added member. */
export function deleteTeamMember(memberId: string) {
  return getApi().delete<BaseApiResponse<{ deleted: boolean }>>(`${BASE}/members/${memberId}`)
}

/** GET /me/prism — the caller's own 8 PRISM behaviours for the map popup. */
export function getMyPrism() {
  return getApi().get<BaseApiResponse<SelfPrismResponse>>(`${BASE}/me/prism`)
}
