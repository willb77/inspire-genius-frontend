import { api } from "@/lib/axios"
import type {
  JoinRequest,
  CreateJoinRequestPayload,
  DecideJoinRequestPayload,
} from "@/types/org-membership"

interface Envelope<T> {
  success: boolean
  data: T
  message: string
}

/** Declare which organisation you belong to. Confers nothing until approved. */
export async function createJoinRequest(payload: CreateJoinRequestPayload) {
  const res = await api.post<Envelope<JoinRequest>>("/v1/orgs/join-requests", payload)
  return res.data.data
}

/**
 * Your own claim and its status.
 *
 * Returns `null` rather than 404ing when you have never declared — "no request"
 * is a legitimate state, not an error, and the caller has to render it.
 */
export async function getMyJoinRequest() {
  const res = await api.get<Envelope<JoinRequest | null>>("/v1/orgs/join-requests/me")
  return res.data.data
}

/** The approval queue for one organisation. Manager / company-admin only. */
export async function listJoinRequests(orgId: string, status = "pending") {
  const res = await api.get<Envelope<JoinRequest[]>>(
    `/v1/orgs/${orgId}/join-requests`,
    { params: { status } },
  )
  return res.data.data
}

/** Approve or reject. Approval is what writes the tenant key. */
export async function decideJoinRequest(
  requestId: string,
  payload: DecideJoinRequestPayload,
) {
  const res = await api.post<Envelope<JoinRequest>>(
    `/v1/orgs/join-requests/${requestId}/decide`,
    payload,
  )
  return res.data.data
}
