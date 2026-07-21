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
  CareerMatch,
  DevelopmentGap,
  GoalCategoryCoverage,
  LearningItem,
  MemberDossier,
  Milestone,
  RosterMember,
  SummitGoal,
} from "@/types/development"

const BASE = "/v1/growth"

/** GET /roster → RosterMember[] */
export function getTeamDevelopmentRoster() {
  return getApi().get<BaseApiResponse<RosterMember[]>>(`${BASE}/roster`)
}

/** GET /members/{id}/dossier?refresh=bool → MemberDossier */
export function getMemberDossier(memberId: string, refresh = false) {
  return getApi().get<BaseApiResponse<MemberDossier>>(
    `${BASE}/members/${memberId}/dossier`,
    { params: refresh ? { refresh: true } : undefined },
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
