import { getApi } from "@/lib/agentApi"
import type { SummitGoal, SummitSession } from "@/types/summit"

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
