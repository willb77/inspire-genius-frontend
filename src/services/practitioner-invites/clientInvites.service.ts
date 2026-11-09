import axios from "axios"
import { agentApi } from "@/lib/agentApi"
import type {
  ClaimOutcome,
  ClientInvite,
  ClientInvitesState,
  IssuedClientInvite,
} from "@/types/practitioner-invites"

/**
 * PI-4 — client invite links (PI-3a routes on the agent engine).
 *
 * `agentApi`, because the routes live under `/v1/agents/{proxy+}`. The server
 * keys every practitioner read and write on the verified token; nothing
 * identifying the practitioner is sent.
 */
export const INVITES_PATH = "/v1/agents/practitioner-registry/invites"
export const CLAIM_PATH = `${INVITES_PATH}/claim`

type Envelope<T> = { status?: boolean; data: T }

function statusOf(err: unknown): number | undefined {
  return axios.isAxiosError(err) ? err.response?.status : undefined
}

/**
 * The caller's own invites. 404 (the invite switch does not apply to this
 * practitioner — FastAPI's own "Not Found") and 403 (programme off) are
 * expected answers and come back as `off`; anything else throws so the page
 * can say "could not load" rather than pretend there are none.
 */
export async function listClientInvites(): Promise<ClientInvitesState> {
  try {
    const { data } = await agentApi.get<Envelope<{ invites: ClientInvite[] }>>(INVITES_PATH)
    return { state: "live", invites: data.data?.invites ?? [] }
  } catch (err) {
    const status = statusOf(err)
    if (status === 404 || status === 403) return { state: "off" }
    throw err
  }
}

/** Issue a link for one of the caller's own clients. The token is in `invitePath`, once. */
export async function createClientInvite(clientId: string): Promise<IssuedClientInvite> {
  const { data } = await agentApi.post<Envelope<IssuedClientInvite>>(INVITES_PATH, { clientId })
  return data.data
}

export async function revokeClientInvite(inviteId: string): Promise<ClientInvite> {
  const { data } = await agentApi.post<Envelope<{ invite: ClientInvite }>>(
    `${INVITES_PATH}/${encodeURIComponent(inviteId)}/revoke`,
  )
  return data.data.invite
}

/** A new link for the same client; the old one stops working. Token in `invitePath`, once. */
export async function rotateClientInvite(inviteId: string): Promise<IssuedClientInvite> {
  const { data } = await agentApi.post<Envelope<IssuedClientInvite>>(
    `${INVITES_PATH}/${encodeURIComponent(inviteId)}/rotate`,
  )
  return data.data
}

/**
 * S7 — present the stored token, signed in. The token travels in the BODY
 * (never a query string: the engine's access log records query strings).
 *
 * Never throws: every answer is an outcome, so the page can always say what
 * happened and the caller can always clear the token. Every token failure is
 * the server's one neutral 404 → `not_valid`.
 */
export async function claimClientInvite(token: string): Promise<ClaimOutcome> {
  try {
    const { data } = await agentApi.post<Envelope<{ practitionerName?: string }>>(CLAIM_PATH, {
      token,
    })
    return {
      outcome: "claimed",
      practitionerName: data.data?.practitionerName || "your practitioner",
    }
  } catch (err) {
    const status = statusOf(err)
    if (status === 404) return { outcome: "not_valid" }
    if (status === 429) return { outcome: "too_many" }
    if (status === 422) return { outcome: "own_invite" }
    return { outcome: "error" }
  }
}

/** A server `detail` string for a toast, never "[object Object]". */
export function inviteErrorMessage(err: unknown): string | undefined {
  if (!axios.isAxiosError(err)) return undefined
  const detail = (err.response?.data as { detail?: unknown } | undefined)?.detail
  return typeof detail === "string" ? detail : undefined
}
