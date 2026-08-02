import { getApi } from "@/lib/agentApi"
import type {
  CaptureRequest,
  CaptureResponse,
  MemberNarrative,
  MemoirRequest,
  MemoirResponse,
} from "@/types/bio"

/**
 * Chronicle's Bio Capture endpoints.
 *
 * `/v1/agents/*` is the only prefix API Gateway routes to the Agent Engine, so
 * these go through `getApi()` / `agentApi`. A bare `/v1/bio/...` would fall
 * through to the monolith's Strangler-Fig catch-all and 404 in the browser
 * while passing every test.
 *
 * Neither response is wrapped in the `ok()` envelope — the body IS the payload.
 * Do not add a `.data.data` unwrap.
 */
const PREFIX = "/v1/agents/bio"

/**
 * GET /{memberId} — the member's whole life narrative in one read.
 *
 * Never 404s: an unknown member returns an empty narrative (`bioStarted:
 * false`), so the UI never has to special-case "never started".
 */
export async function getMemberNarrative(
  memberId: string,
): Promise<MemberNarrative> {
  const { data } = await getApi().get<MemberNarrative>(
    `${PREFIX}/${encodeURIComponent(memberId)}`,
  )
  return data
}

/**
 * POST /{memberId}/memoir — assemble a memoir from the captured narrative.
 *
 * MAY 404 in environments where the backend has not been promoted yet. This
 * function does NOT swallow that: it lets the error propagate so the caller
 * (the mutation / export handler) can fall back to a client-side memoir built
 * from the narrative it already holds.
 */
export async function generateMemoir(
  memberId: string,
  opts: MemoirRequest = {},
): Promise<MemoirResponse> {
  const { data } = await getApi().post<MemoirResponse>(
    `${PREFIX}/${encodeURIComponent(memberId)}/memoir`,
    opts,
  )
  return data
}

/**
 * POST /{memberId}/capture — extract, persist, and reflect back a single chat
 * turn.
 *
 * Fired alongside the Chronicle chat send (not in place of it): the WebSocket
 * carries the conversational reply, while this call returns the structured
 * reflection ("Captured to your profile") and the content-specific followups
 * that replace the old generic probe rotation. Per the backend contract it
 * never 500s — a turn with nothing extractable comes back `captured: false`
 * with an empty `episodes` array, which the caller renders as "no card".
 */
export async function captureBioTurn(
  memberId: string,
  body: CaptureRequest,
): Promise<CaptureResponse> {
  const { data } = await getApi().post<CaptureResponse>(
    `${PREFIX}/${encodeURIComponent(memberId)}/capture`,
    body,
  )
  return data
}
