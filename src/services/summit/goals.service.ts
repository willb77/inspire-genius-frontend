import { getApi } from "@/lib/agentApi"
import type {
  GoalVisibility,
  MyGoalsResponse,
  SharedGoal,
  SummitAnswer,
  SummitAskResponse,
  SummitCategoryKey,
  SummitCategoryStatus,
  SummitGoal,
  SummitGoalCreate,
  SummitSession,
  SummitSynthesizeResponse,
  SummitWhyExchange,
  SummitWhyResponse,
} from "@/types/summit"

/**
 * Summit's live goal store.
 *
 * `/v1/agents/*` is the only prefix API Gateway routes to the Agent Engine, so
 * these go through `getApi()`/`agentApi`. A bare `/v1/goals/...` would fall
 * through to the monolith's Strangler-Fig catch-all and 404 in the browser
 * while passing every test — the backend router carries the same warning.
 *
 * Unlike the Direction Setting services, these responses are NOT wrapped in the
 * `ok()` envelope. The session dict is the body. Do not add a `.data.data`.
 */
const PREFIX = "/v1/agents/goals"

/**
 * GET /session — the caller's whole goal-setting state in one read.
 *
 * Creates an empty session on first touch, so the UI never has to special-case
 * "never started". Everything Summit renders that is real comes from here.
 */
export async function getGoalSession() {
  const { data } = await getApi().get<SummitSession>(`${PREFIX}/session`)
  return data
}

/** PATCH /{goal_id} — confirm or edit a goal. Summit proposes, the person ratifies. */
export async function patchGoal(
  goalId: string,
  body: Partial<
    Pick<
      SummitGoal,
      | "title"
      | "status"
      | "motivation"
      | "success_metric"
      | "first_step"
      | "owning_coach"
    >
  >
) {
  const { data } = await getApi().patch<SummitGoal>(`${PREFIX}/${goalId}`, body)
  return data
}

/** DELETE /{goal_id} — 204 on success, 404 if it was already gone. */
export async function deleteGoal(goalId: string) {
  await getApi().delete(`${PREFIX}/${goalId}`)
}

// ─── The interview ──────────────────────────────────────────────────────
//
// Three structured calls, driven directly rather than through chat. The client
// knows the category and the rung at every point, so there is nothing for
// intent classification to get wrong. These existed and worked on the backend
// long before anything called them — the interview was built and never driven.

/**
 * POST /ask — the question thread for one discovery category.
 *
 * The backend personalises to the caller's PRISM profile and to whatever they
 * have already answered in this category, so re-asking a partly-explored
 * category continues rather than repeats.
 */
export async function askCategory(category: SummitCategoryKey | string) {
  const { data } = await getApi().post<SummitAskResponse>(`${PREFIX}/ask`, {
    category,
  })
  return data
}

/**
 * POST /why-ladder — the next "why", or the root.
 *
 * Stateless: the whole ladder so far goes up on every call, and the backend
 * decides whether we have bottomed out. When it says we have, it also persists
 * the root against the stated goal so synthesis can use it as the motivation.
 */
export async function whyLadder(
  statedGoal: string,
  exchanges: SummitWhyExchange[] = []
) {
  const { data } = await getApi().post<SummitWhyResponse>(
    `${PREFIX}/why-ladder`,
    { stated_goal: statedGoal, exchanges }
  )
  return data
}

/**
 * POST /discovery/{category} — bank the answers for a category.
 *
 * Answers are appended, so this must be called once per category with the
 * answers gathered in that pass — calling it again with the same payload
 * duplicates them.
 */
export async function saveDiscovery(
  category: SummitCategoryKey | string,
  body: { answers: SummitAnswer[]; summary?: string; status?: SummitCategoryStatus }
) {
  const { data } = await getApi().post<SummitSession>(
    `${PREFIX}/discovery/${category}`,
    body
  )
  return data
}

/**
 * POST /synthesize — captured answers + PRISM become structured goals.
 *
 * Goals the person has acted on are preserved; prior unconfirmed proposals are
 * replaced. Returns both the fresh goals and the whole updated session, so the
 * caller can seed the cache instead of re-reading.
 *
 * Returns no goals when nothing has been captured — that is the backend saying
 * "there is nothing to synthesise yet", not a failure.
 */
export async function synthesizeGoals() {
  const { data } = await getApi().post<SummitSynthesizeResponse>(
    `${PREFIX}/synthesize`
  )
  return data
}

// ─── The shared record — Goals offering, Phase 3 ────────────────────────
//
// Four routes appended in Phase 1 (backend PR #1153). Unlike the session
// routes above these DO return the `ok()` envelope, so each unwraps `.data`.
// publish / unpublish take the SESSION goal_id; visibility takes the SHARED
// goalId (the one `/mine` returns) — two id namespaces, deliberately.

type Envelope<T> = { status: boolean; data: T }

/** POST / — add a goal to the session by hand (title + category). 201. */
export async function createGoal(body: SummitGoalCreate) {
  const { data } = await getApi().post<SummitGoal>(PREFIX, body)
  return data
}

/** GET /mine — my published goals + coverage, coach contract shape. */
export async function getMyGoals() {
  const { data } = await getApi().get<Envelope<MyGoalsResponse>>(`${PREFIX}/mine`)
  return data.data
}

/** POST /{session goal_id}/publish — upsert the shared record (idempotent). */
export async function publishGoal(sessionGoalId: string) {
  const { data } = await getApi().post<Envelope<SharedGoal>>(
    `${PREFIX}/${encodeURIComponent(sessionGoalId)}/publish`
  )
  return data.data
}

/** POST /{session goal_id}/unpublish — remove that one shared row; the session goal stays. */
export async function unpublishGoal(sessionGoalId: string) {
  const { data } = await getApi().post<Envelope<{ publishedFrom: string; removed: boolean }>>(
    `${PREFIX}/${encodeURIComponent(sessionGoalId)}/unpublish`
  )
  return data.data
}

/** PATCH /{shared goalId}/visibility — shareable | private. */
export async function setGoalVisibility(sharedGoalId: string, visibility: GoalVisibility) {
  const { data } = await getApi().patch<Envelope<SharedGoal>>(
    `${PREFIX}/${encodeURIComponent(sharedGoalId)}/visibility`,
    { visibility }
  )
  return data.data
}
