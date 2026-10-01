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
  GapSeverity,
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

// ── Team Studio saved analyses (per manager + member) ───────────────────────

/**
 * Which Studio output a row holds. Mirrors growth-service `schemas.AnalysisKind`
 * exactly — `Literal["analyse", "compare", "scenario", "questions"]`. The
 * server does not validate beyond that literal, so a value invented here would
 * be a 422 rather than a silent miss.
 *
 * `questions` is unused by this client today; it is in the union because the
 * server accepts it, and leaving it out would make a legitimate row read as an
 * unknown kind rather than as a kind nothing renders yet.
 */
export type AnalysisKind = "analyse" | "compare" | "scenario" | "questions"

/**
 * One saved Studio output. Mirrors growth-service `schemas.AnalysisOut`.
 *
 * `inputs` is opaque JSONB server-side — it is whatever the client that wrote
 * the row put there, so every reader must treat it as untyped and degrade
 * rather than assume its shape. See `@/lib/savedAnalysis`.
 */
export type SavedAnalysis = {
  id: string
  memberId: string
  kind: string
  title?: string | null
  content: string
  inputs?: Record<string, unknown> | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** What GET /members/{id}/analyses returns (`schemas.AnalysisList`). */
export type SavedAnalysisList = { analyses: SavedAnalysis[] }

/** `schemas.AnalysisCreate`. `content` and `kind` are required server-side. */
export type CreateAnalysisInput = {
  kind: AnalysisKind
  content: string
  title?: string
  inputs?: Record<string, unknown>
}

/**
 * `schemas.AnalysisUpdate`. Every field optional, and the server uses
 * `exclude_unset`, so an omitted key is left alone while an explicit `null`
 * clears one — `undefined` and `null` are different requests.
 */
export type UpdateAnalysisInput = {
  title?: string | null
  content?: string
  inputs?: Record<string, unknown> | null
}

/**
 * GET /members/{id}/analyses — THIS manager's saved analyses for this member,
 * newest first (the server's order; nothing re-sorts it here).
 *
 * Scoped `(manager_sub, member_id)` server-side, from the caller's own signed
 * sub. **No manager identifier is sent**, deliberately: there is nothing in the
 * request a client could set, mistype or tamper with that would widen it, so
 * two managers coaching the same person issue byte-identical requests and get
 * disjoint answers.
 */
export function listMemberAnalyses(memberId: string) {
  return getApi().get<BaseApiResponse<SavedAnalysisList>>(
    `${BASE}/members/${memberId}/analyses`,
  )
}

/**
 * POST /members/{id}/analyses → 201 with the stored row.
 *
 * Stored rather than regenerated because model output is not reproducible:
 * re-running would hand the manager a different document under the same title.
 *
 * D-TDS3 — **analyses follow the member.** The row is keyed on the member whose
 * workspace it was saved in, which matters for a comparison or a scenario that
 * names several colleagues: it belongs to the workspace it was taken in, and
 * does not appear in the other subjects' workspaces. That is enforced by the
 * URL, so it is already true while the table is empty (0 rows on dev and 0 on
 * staging-b, 2026-09-30) and needs no migration later.
 */
export function createMemberAnalysis(memberId: string, input: CreateAnalysisInput) {
  return getApi().post<BaseApiResponse<SavedAnalysis>>(
    `${BASE}/members/${memberId}/analyses`,
    input,
  )
}

/**
 * PATCH /members/{id}/analyses/{analysisId} — only the fields sent are written.
 *
 * 404 covers both "no such analysis" and "not yours"; the lookup is scoped by
 * manager AND member rather than fetched-then-checked, so the two are
 * indistinguishable by design. Never render it as a permission message — that
 * would tell a caller somebody else's analysis exists.
 */
export function updateMemberAnalysis(
  memberId: string,
  analysisId: string,
  input: UpdateAnalysisInput,
) {
  return getApi().patch<BaseApiResponse<SavedAnalysis>>(
    `${BASE}/members/${memberId}/analyses/${analysisId}`,
    input,
  )
}

/** DELETE /members/{id}/analyses/{analysisId}. 404 if it is not this manager's. */
export function deleteMemberAnalysis(memberId: string, analysisId: string) {
  return getApi().delete<BaseApiResponse<{ deleted: boolean }>>(
    `${BASE}/members/${memberId}/analyses/${analysisId}`,
  )
}

export type CoachingNoteKind = "observation" | "plan" | "outcome"

export type CoachingNoteSource = "analysis" | "compare" | "scenario" | "ask" | "manual"

export type CreateCoachingNoteInput = {
  kind: CoachingNoteKind
  body: string
  /** A shared goal of this member. A note is about a goal OR a milestone OR
   *  neither — never both (the server rejects both with 400). */
  goalId?: string
  milestoneId?: string
  source?: CoachingNoteSource
  /** The analysis / scenario it was taken against. Not an FK server-side: the
   *  analysis may be deleted while the note outlives it. */
  sourceRef?: string
}

export type CoachingNote = {
  id: string
  memberId: string
  kind: CoachingNoteKind
  body: string
  source?: string | null
  sourceRef?: string | null
  goalId?: string | null
  milestoneId?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

/** GET /members/{id}/notes → { notes } (NoteList). */
export type CoachingNoteList = { notes: CoachingNote[] }

/**
 * Every field optional — the server writes ONLY what is sent, and an explicit
 * `null` clears one. So `undefined` and `null` are different requests here, and
 * a caller that wants to leave `goalId` alone must omit the key rather than
 * sending `null` for it.
 */
export type UpdateCoachingNoteInput = {
  kind?: CoachingNoteKind
  body?: string
  source?: CoachingNoteSource
  sourceRef?: string | null
  goalId?: string | null
  milestoneId?: string | null
}

/**
 * POST /members/{id}/notes — one coaching note (this manager's, this member).
 *
 * The notes are **per-manager**: one coach's candid read of a person, not a
 * shared record. Nothing on this surface may imply the member or another
 * manager can read them.
 */
export function createCoachingNote(memberId: string, input: CreateCoachingNoteInput) {
  return getApi().post<BaseApiResponse<CoachingNote>>(`${BASE}/members/${memberId}/notes`, input)
}

/** GET /members/{id}/notes — this manager's notes for this member, newest first.
 *  The order is the server's; nothing re-sorts it here. */
export function listCoachingNotes(memberId: string) {
  return getApi().get<BaseApiResponse<CoachingNoteList>>(`${BASE}/members/${memberId}/notes`)
}

/** PATCH /members/{id}/notes/{noteId} — only the fields sent are written. */
export function updateCoachingNote(
  memberId: string,
  noteId: string,
  input: UpdateCoachingNoteInput,
) {
  return getApi().patch<BaseApiResponse<CoachingNote>>(
    `${BASE}/members/${memberId}/notes/${noteId}`,
    input,
  )
}

/**
 * DELETE /members/{id}/notes/{noteId}.
 *
 * 404 covers both "no such note" and "not this manager's" — indistinguishable
 * by design. Never render it as a permission message: that would tell a caller
 * that somebody else's note exists.
 */
export function deleteCoachingNote(memberId: string, noteId: string) {
  return getApi().delete<BaseApiResponse<{ deleted: boolean }>>(
    `${BASE}/members/${memberId}/notes/${noteId}`,
  )
}

/** GET /members/{id}/gaps?target_blueprint_id= → DevelopmentGap[] */
export function getGapAnalysis(memberId: string, targetBlueprintId?: string) {
  return getApi().get<BaseApiResponse<DevelopmentGap[]>>(
    `${BASE}/members/${memberId}/gaps`,
    { params: targetBlueprintId ? { target_blueprint_id: targetBlueprintId } : undefined },
  )
}

/**
 * POST /members/{id}/gaps/{gapId}/close → the CLOSED gap.
 *
 * 404 when there is no such gap for this member — the lookup is scoped to the
 * member, so a gap id guessed from someone else's plan cannot be closed.
 *
 * `GET /members/{id}/gaps` does **not** filter closed rows out (`list_gaps`
 * selects on member + target only), so a closed gap keeps coming back in the
 * list and the surface has to render its status. Don't assume it disappears.
 */
export function closeGap(memberId: string, gapId: string) {
  return getApi().post<BaseApiResponse<DevelopmentGap>>(
    `${BASE}/members/${memberId}/gaps/${gapId}/close`,
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

/**
 * Progress on a learning item. Every field optional — the server writes ONLY
 * what is sent, so omitting a key leaves it alone.
 *
 * `progress` and `quizScore` are percentages, 0..100.
 */
export type UpdateLearningItemInput = {
  status?: LearningItem["status"]
  progress?: number
  quizScore?: number
  lmsRef?: string
  estHours?: number
  format?: LearningItem["format"]
}

/** PATCH /members/{id}/learning-items/{itemId} → LearningItem (coach-side). */
export function updateLearningItem(
  memberId: string,
  itemId: string,
  input: UpdateLearningItemInput,
) {
  return getApi().patch<BaseApiResponse<LearningItem>>(
    `${BASE}/members/${memberId}/learning-items/${itemId}`,
    input,
  )
}

/** PATCH /me/learning-items/{itemId} → LearningItem (the learner's own row). */
export function updateMyLearningItem(itemId: string, input: UpdateLearningItemInput) {
  return getApi().patch<BaseApiResponse<LearningItem>>(
    `${BASE}/me/learning-items/${itemId}`,
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

// ── Self-scoped reads and writes (/v1/growth/me/*) — TDS-4c ─────────────────
//
// The member id is never passed: growth-service resolves it from the verified
// JWT `sub` (`require_caller_sub`), so there is no id a client could change to
// read somebody else's plan. These are the SAME service functions the
// `/members/{id}/*` routes above call — only the resolution differs — which is
// why there is one data layer here rather than a parallel "my" service module.
//
// They are collected in this file deliberately: `getMyGoalReviews`,
// `updateMyLearningItem` and `getMyPrism` already lived here, and a second
// module would give growth-service two front doors in the frontend.

/**
 * Body for POST /me/gaps — a gap the person declares about themselves.
 *
 * `source` is NOT accepted by the server on this path: it always persists
 * `source='skill'`. That is what makes a self-declared gap survive a dossier
 * recompute, which deletes and rebuilds only the `behavioral` rows.
 */
export type CreateGapInput = {
  competency: string
  currentLevel?: number
  targetLevel?: number
  severity?: GapSeverity
  goalId?: string
  targetBlueprintId?: string
}

/** GET /me/gaps?target_blueprint_id= → the caller's own gaps.
 *
 *  Closed gaps are NOT filtered out server-side (`list_gaps` selects on member
 *  + target only), so the caller has to render a gap's status rather than
 *  assume a closed one disappears. */
export function getMyGaps(targetBlueprintId?: string) {
  return getApi().get<BaseApiResponse<DevelopmentGap[]>>(`${BASE}/me/gaps`, {
    params: targetBlueprintId ? { target_blueprint_id: targetBlueprintId } : undefined,
  })
}

/** POST /me/gaps → 201 with the created gap. */
export function createMyGap(input: CreateGapInput) {
  return getApi().post<BaseApiResponse<DevelopmentGap>>(`${BASE}/me/gaps`, input)
}

/** POST /me/gaps/{gapId}/close → the CLOSED gap. 404 when it is not the
 *  caller's own gap — the lookup is scoped to the resolved member. */
export function closeMyGap(gapId: string) {
  return getApi().post<BaseApiResponse<DevelopmentGap>>(`${BASE}/me/gaps/${gapId}/close`)
}

/** GET /me/learning-items → the caller's own learning plan. */
export function getMyLearningItems() {
  return getApi().get<BaseApiResponse<LearningItem[]>>(`${BASE}/me/learning-items`)
}

/** POST /me/learning-items → 201 with the created item. */
export function createMyLearningItem(input: CreateLearningItemInput) {
  return getApi().post<BaseApiResponse<LearningItem>>(`${BASE}/me/learning-items`, input)
}

/** GET /me/milestones → the caller's own roadmap milestones.
 *
 *  Read-only for the member by design: there is no self-scoped POST or PATCH
 *  for milestones on the tip, so this surface shows the roadmap and does not
 *  offer to edit it. */
export function getMyMilestones() {
  return getApi().get<BaseApiResponse<Milestone[]>>(`${BASE}/me/milestones`)
}

/**
 * GET /me/profile — every PRISM scale on file for the CALLER, up to 88.
 *
 * The self counterpart of {@link getMemberFullPrism}, with an identical
 * response shape. Callers MUST honour `isConflicted`: it is a refusal, not a
 * warning — two assessments under one account disagree, which on dev was two
 * different people's reports filed under one account. Show `conflictMessage`
 * and nothing else. `coverage < 88` is the ordinary case (75–87 measured, plus
 * a 26-scale legacy outlier) and `missing` names the gaps.
 */
export function getMyFullPrism() {
  return getApi().get<BaseApiResponse<FullPrismProfileResponse>>(`${BASE}/me/profile`)
}
