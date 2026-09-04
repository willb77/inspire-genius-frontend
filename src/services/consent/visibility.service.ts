import { agentApi } from "@/lib/agentApi"
import type {
  AccessLogRow,
  ExtendResult,
  LookupResult,
  MyGrantRow,
  OfferResult,
  PeopleResponse,
  VisibilityCategories,
} from "@/types/consent"

/**
 * Student visibility consent — the SUBJECT's calls (Goals offering, Phase 3).
 *
 * The manager's ask lives in `services/manager/studentRoster.service.ts`
 * (`requestStudentAccess`). Everything here is the other side: who could I
 * share with, offer, renew, revoke, answer a request. All under
 * `/v1/agents/consent/visibility` on the agent engine — `agentApi`, never the
 * monolith instance — and all `ok()`-enveloped.
 *
 * Nothing here takes a subject id: the backend scopes every call to the token.
 */
const BASE = "/v1/agents/consent/visibility"

type Envelope<T> = { status: boolean; data: T }

function unwrap<T>(body: Envelope<T> | undefined): T {
  if (!body || body.status !== true || body.data === undefined) {
    throw new Error("Consent service returned an empty envelope")
  }
  return body.data
}

/** GET /people — who I could share with, with each source's read state. */
export async function getPeople(): Promise<PeopleResponse> {
  const { data } = await agentApi.get<Envelope<PeopleResponse>>(`${BASE}/people`)
  return unwrap(data)
}

/** POST /people/lookup — ONE exact email → a person. 404 otherwise; never a search. */
export async function lookupPerson(email: string): Promise<LookupResult> {
  const { data } = await agentApi.post<Envelope<LookupResult>>(`${BASE}/people/lookup`, {
    email: email.trim(),
  })
  return unwrap(data)
}

/** POST /offer — grant a person access now, for `termDays` (default a year). */
export async function offerAccess(input: {
  granteeUserId: string
  categories: VisibilityCategories
  termDays?: number
}): Promise<OfferResult> {
  const { data } = await agentApi.post<Envelope<OfferResult>>(`${BASE}/offer`, {
    granteeUserId: input.granteeUserId,
    categories: input.categories,
    ...(input.termDays !== undefined ? { termDays: input.termDays } : {}),
  })
  return unwrap(data)
}

/** POST /{grant_id}/extend — a fresh term from today. Holder only. */
export async function extendGrant(grantId: string, days = 365): Promise<ExtendResult> {
  const { data } = await agentApi.post<Envelope<ExtendResult>>(
    `${BASE}/${encodeURIComponent(grantId)}/extend`,
    { days }
  )
  return unwrap(data)
}

/** POST /{grant_id}/revoke — immediate, no grace period. */
export async function revokeGrant(grantId: string): Promise<{ id: string; status: "revoked" }> {
  const { data } = await agentApi.post<Envelope<{ id: string; status: "revoked" }>>(
    `${BASE}/${encodeURIComponent(grantId)}/revoke`
  )
  return unwrap(data)
}

/** GET /my-grants — every row about me: pending asks, live grants, history. */
export async function getMyGrants(): Promise<MyGrantRow[]> {
  const { data } = await agentApi.get<Envelope<MyGrantRow[]>>(`${BASE}/my-grants`)
  return unwrap(data)
}

/** POST /{grant_id}/respond — answer a pending request; a subset is a valid yes. */
export async function respondToRequest(
  grantId: string,
  approve: boolean,
  categories?: VisibilityCategories
): Promise<{ id: string; status: "granted" | "declined" }> {
  const { data } = await agentApi.post<Envelope<{ id: string; status: "granted" | "declined" }>>(
    `${BASE}/${encodeURIComponent(grantId)}/respond`,
    { approve, ...(categories ? { categories } : {}) }
  )
  return unwrap(data)
}

/** GET /access-log — who has looked at the caller's data, newest first. */
export async function getAccessLog(): Promise<AccessLogRow[]> {
  const { data } = await agentApi.get<Envelope<AccessLogRow[]>>(`${BASE}/access-log`)
  return data.data ?? []
}
