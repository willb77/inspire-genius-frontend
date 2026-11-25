/**
 * TDS-U11b — the practitioner's client roster, read off `GET /v1/growth/roster`.
 *
 * growth-service (TDS-U11a, behind the default-OFF switch
 * `tds_practitioner_client_roster`) can send a practitioner two kinds of card
 * that no other roster carries:
 *
 *  - a LINKED client: an ordinary card plus `clientId` (the coach-table id My
 *    Clients and Client Profile key on) and `connected: true`;
 *  - an UNCONNECTED client: `memberId: null`, `clientId`, `connected: false`.
 *    There is no account, so there is no development page to open.
 *
 * Every other roster — and a practitioner's while the switch is off — carries
 * neither field and never a null `memberId`. These functions are the one place
 * the two shapes are told apart, so every existing roster consumer keeps
 * receiving `memberId: string` and nothing downstream has to learn about null.
 */
import type { RosterMember } from "@/types/development"

/** One card as the server sends it (the wire shape, before the split). */
export type RosterEntry = Omit<RosterMember, "memberId"> & {
  memberId: string | null
  clientId?: string | null
  connected?: boolean | null
}

/** A client the practitioner added who has not connected an account yet. */
export type UnconnectedClient = {
  clientId: string
  name: string
}

function hasMemberId(e: RosterEntry): e is RosterEntry & { memberId: string } {
  return typeof e.memberId === "string" && e.memberId.length > 0
}

/**
 * The cards that name a person with a development page. On every roster the
 * server sends today this is the whole list, unchanged and in order.
 */
export function connectedMembers(entries: RosterEntry[] | null | undefined): RosterMember[] {
  if (!Array.isArray(entries)) return []
  return entries.filter(hasMemberId) as RosterMember[]
}

/**
 * The practitioner's clients with no account yet. Only a card the server
 * marked `connected: false` with a `clientId` counts: a card that merely lacks
 * a member id is malformed, and is dropped rather than guessed at.
 */
export function unconnectedClients(entries: RosterEntry[] | null | undefined): UnconnectedClient[] {
  if (!Array.isArray(entries)) return []
  return entries
    .filter((e) => !hasMemberId(e) && e.connected === false && typeof e.clientId === "string" && e.clientId.length > 0)
    .map((e) => ({ clientId: e.clientId as string, name: e.name }))
}

/** The coach-table client id on a linked client's card, or null on any other card. */
export function clientIdOf(member: RosterMember): string | null {
  const id = (member as RosterMember & { clientId?: unknown }).clientId
  return typeof id === "string" && id.length > 0 ? id : null
}
