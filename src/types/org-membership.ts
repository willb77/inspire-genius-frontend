/**
 * Self-declared organisation membership.
 *
 * A declaration is a claim typed by the person who benefits from it, so it
 * grants nothing on its own — `user_profiles.org_id` is written only when a
 * manager or company-admin of that organisation approves. These types mirror
 * that: a request has a `status`, and everything else about it is read-only
 * to the person who made it.
 */

export type JoinRequestStatus = "pending" | "approved" | "rejected"

export interface JoinRequest {
  id: string
  user_id: string
  email: string
  org_id: string
  status: JoinRequestStatus
  note: string | null
  decided_by: string | null
  decided_at: string | null
  decision_reason: string | null
  created_at: string
}

export interface CreateJoinRequestPayload {
  org_id: string
  note?: string
}

export interface DecideJoinRequestPayload {
  approve: boolean
  reason?: string
}
