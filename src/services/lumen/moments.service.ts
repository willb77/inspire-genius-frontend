import { getApi } from "@/lib/agentApi"
import type { VerticalApiResponse } from "@/verticals/core"
import type {
  AskMomentRequest,
  Moment,
  MomentState,
  MomentsFeed,
} from "@/types/lumen"

// Lumen lives on the Agent Engine — `/v1/agents/*` through `agentApi`, never
// the monolith `api` instance.
const PREFIX = "/v1/agents/lumen"

/**
 * POST /v1/agents/lumen/moments/ask — generate one Moment, synchronously.
 *
 * The Moment is written to the feed as it is returned, so the page the user is
 * looking at and the feed they come back to never disagree.
 */
export async function askMoment(body: AskMomentRequest) {
  const { data } = await getApi().post<VerticalApiResponse<Moment>>(
    `${PREFIX}/moments/ask`,
    body
  )
  return data
}

/** GET /v1/agents/lumen/moments — the caller's feed, newest first. */
export async function getMoments(limit = 20, offset = 0) {
  const { data } = await getApi().get<VerticalApiResponse<MomentsFeed>>(
    `${PREFIX}/moments`,
    { params: { limit, offset } }
  )
  return data
}

/**
 * PATCH /v1/agents/lumen/moments/{id} — set a Moment's disposition.
 *
 * A Moment the caller doesn't own returns 404 by design, so a failure here is
 * genuinely "not found" rather than "not yours".
 */
export async function setMomentState(momentId: string, state: MomentState) {
  const { data } = await getApi().patch<VerticalApiResponse<Moment>>(
    `${PREFIX}/moments/${momentId}`,
    { state }
  )
  return data
}
