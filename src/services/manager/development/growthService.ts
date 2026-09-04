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
  GoalReviewList,
  BulkMembersResult,
  CareerMatch,
  DevelopmentGap,
  FullPrismProfileResponse,
  GoalCategoryCoverage,
  LearningItem,
  MemberCreateInput,
  MemberCreateResult,
  MemberDossier,
  OrgChartResponse,
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
/**
 * Every PRISM scale on file for one member — up to 88, not the 8 behaviours.
 *
 * The full-profile counterpart to the dossier's `profile.prism`, which carries
 * the behaviour radar and nothing else. This is the only read that returns
 * ADAPTED scores; the dossier path is Underlying-only by construction, because
 * `long_term._load_prism_from_assessments` filters the query to
 * `score_type = 'Underlying'`.
 *
 * Gated server-side by `assert_member_coaching_access` — the gate that denies
 * unless it can prove the caller coaches this member, and fails CLOSED. That is
 * stricter than the permissive `assert_member_access` behind the dossier this
 * surface already reads, so adding this call narrows nothing and widens nothing.
 *
 * Callers must honour `isConflicted`. See `FullPrismProfileResponse`.
 */
export function getMemberFullPrism(memberId: string) {
  return getApi().get<BaseApiResponse<FullPrismProfileResponse>>(
    `${BASE}/members/${memberId}/profile`,
  )
}

/**
 * The caller's own organisation's reporting tree.
 *
 * Takes no arguments on purpose: the organisation is resolved server-side from
 * the caller's signed token, so there is no id a client could change to read a
 * different company. A caller whose org cannot be established gets an empty
 * chart, not an error and not everyone.
 */
export function getOrgChart() {
  return getApi().get<BaseApiResponse<OrgChartResponse>>(`${BASE}/org-chart`)
}

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
  /** Goals offering, Phase 2/4 — the three share states the tab renders,
   *  none of them the empty list:
   *    shared      → goalsSharedUntil = the grant's expiry (null for self /
   *                  super-admin, who hold no grant)
   *    not shared  → goalsNotShared = true
   *    no account  → goalsNotShared = true AND goalsNoAccount = true */
  goalsNotShared?: boolean
  goalsSharedUntil?: string | null
  goalsNoAccount?: boolean
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

/** What POST /goals/{goalId}/ratify returns: the review row it wrote. */
export type RatifyResult = {
  goalId: string
  managerId?: string | null
  ratified: boolean
  comment: string
  reviewId?: string | null
  createdAt?: string | null
}

/**
 * POST /goals/{goalId}/ratify — a coach's review: ratified or not, with a
 * comment. Never overwrites the member's own ratification; writes a
 * goal_reviews row the member reads back (Goals offering, Phase 4, D7).
 */
export function ratifyGoal(goalId: string, comment?: string, ratified = true) {
  return getApi().post<BaseApiResponse<RatifyResult>>(`${BASE}/goals/${goalId}/ratify`, {
    ratified,
    comment: comment ?? "",
  })
}

/** GET /members/{id}/goal-reviews — every coach review of the member's shared
 *  goals; behind the goals grant like every other coach-side reader. */
export function getGoalReviews(memberId: string) {
  return getApi().get<BaseApiResponse<GoalReviewList>>(`${BASE}/members/${memberId}/goal-reviews`)
}

/** GET /me/goal-reviews — the member reads the reviews on their own goals. */
export function getMyGoalReviews() {
  return getApi().get<BaseApiResponse<GoalReviewList>>(`${BASE}/me/goal-reviews`)
}

export type CoachingNoteKind = "observation" | "plan" | "outcome"

export type CreateCoachingNoteInput = {
  kind: CoachingNoteKind
  body: string
  /** A shared goal of this member. A note is about a goal OR a milestone OR
   *  neither — never both (the server rejects both with 400). */
  goalId?: string
  milestoneId?: string
  source?: "analysis" | "compare" | "scenario" | "ask" | "manual"
}

export type CoachingNote = {
  id: string
  memberId: string
  kind: CoachingNoteKind
  body: string
  goalId?: string | null
  milestoneId?: string | null
  createdAt?: string | null
}

/** POST /members/{id}/notes — one coaching note (this manager's, this member). */
export function createCoachingNote(memberId: string, input: CreateCoachingNoteInput) {
  return getApi().post<BaseApiResponse<CoachingNote>>(`${BASE}/members/${memberId}/notes`, input)
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
