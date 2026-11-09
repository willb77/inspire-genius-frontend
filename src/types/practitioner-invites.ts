// PI-4 — practitioner client invite links (S4–S7).
//
// Shapes of `/v1/agents/practitioner-registry/invites*` on the agent engine
// (PI-3a, `app/practitioner_registry/redeem.py` + `client_invites.py`). The
// server never returns a token after create/rotate, and never its hash.

export type ClientInviteStatus =
  | "pending"
  | "claimed"
  | "claimed_by_other"
  | "expired"
  | "revoked"

export type ClientInvite = {
  id: string
  clientId: string
  email: string | null
  status: ClientInviteStatus
  createdAt: string | null
  expiresAt: string | null
  claimedAt: string | null
  /** D1: the claiming account's email, only for status "claimed". */
  claimedEmail: string | null
  revokedAt: string | null
  rotatedFrom: string | null
}

/**
 * The list read. "off" means the invite routes do not apply to this
 * practitioner (the server answers its plain 404, or 403 while the programme
 * switch is off) — the page then shows nothing new.
 */
export type ClientInvitesState =
  | { state: "live"; invites: ClientInvite[] }
  | { state: "off" }

/** Create / rotate: the invite plus the ONE-TIME path `/signup#invite=<token>`. */
export type IssuedClientInvite = {
  invite: ClientInvite
  invitePath: string
}

/** What the signed-in claim came to (S7). Every token failure is "not_valid". */
export type ClaimOutcome =
  | { outcome: "claimed"; practitionerName: string }
  | { outcome: "not_valid" }
  | { outcome: "too_many" }
  | { outcome: "own_invite" }
  | { outcome: "error" }
