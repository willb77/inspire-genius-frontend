import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  AdvanceInput,
  CareerAreas,
  Journey,
  JourneyStage,
} from "@/types/direction-setting"

// Direction Setting's routes live on the Agent Engine, so they go through
// `getApi()`/`agentApi` — never the monolith `api` instance. `/v1/agents/*` is
// the only prefix API Gateway routes to the engine; a bare `/v1/...` path falls
// through to the monolith and 404s in the browser while passing every test.
const PREFIX = "/v1/agents/direction-setting"

/**
 * GET /journey — the caller's state, with the one next action already derived
 * server-side.
 *
 * Creates an empty journey on first touch, so the surface never has to
 * special-case "not started yet" with a separate call.
 */
export async function getJourney() {
  const { data } = await getApi().get<VerticalApiResponse<Journey>>(`${PREFIX}/journey`)
  return data
}

/**
 * POST /journey/advance — record progress on a stage, optionally keeping what
 * it produced.
 *
 * Idempotent: re-advancing a stage to the state it already holds is a no-op,
 * and the furthest-reached marker only moves forward, so a double-click or a
 * replayed request cannot walk a user backwards.
 */
export async function advanceJourney(body: AdvanceInput) {
  const { data } = await getApi().post<VerticalApiResponse<Journey>>(
    `${PREFIX}/journey/advance`,
    body
  )
  return data
}

/** POST /journey/reset — start over. Keeps the row so `createdAt` survives. */
export async function resetJourney() {
  const { data } = await getApi().post<VerticalApiResponse<Journey>>(
    `${PREFIX}/journey/reset`,
    {}
  )
  return data
}

/**
 * GET /stages — the 13 stage definitions.
 *
 * Served rather than hardcoded so a stage added or reworded on the backend
 * changes the product without a coordinated frontend release. Rarely needed
 * directly: `getJourney` already returns the list with per-stage state.
 */
export async function getStages() {
  const { data } = await getApi().get<VerticalApiResponse<{ stages: JourneyStage[] }>>(
    `${PREFIX}/stages`
  )
  return data
}

/**
 * GET /careers — Stage 3: ranked role families with affinity and pivot
 * difficulty.
 *
 * Deterministic — the same PRISM always yields the same ranking, and every
 * number is inspectable. A caller with no PRISM gets an empty list and a `note`
 * explaining why, not an error.
 */
export async function getCareerAreas(limit = 5) {
  const { data } = await getApi().get<VerticalApiResponse<CareerAreas>>(
    `${PREFIX}/careers`,
    { params: { limit } }
  )
  return data
}
