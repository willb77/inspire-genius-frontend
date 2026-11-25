import { useCallback, useMemo } from "react"
import type { SubjectListPort } from "@/components/prism/studio/ports"
import type { StudioSubject } from "@/hooks/useTeamStudio"
import type { RosterMember } from "@/types/development"
import { useStudioCast } from "./useStudioCast"
import { useTeamDevelopmentRoster } from "./useTeamDevelopmentRoster"

/**
 * U5 — the cast for the Studio-level Team view (Compare and Scenarios).
 *
 * The member-page cast (`useStudioCast`) lists everyone on the roster with
 * PRISM on file. The Team view lists fewer: only people who share their PRISM
 * with the caller. That is read from ONE place, the roster's server-computed
 * `sharing` field (growth-service, TDS-U6b):
 *
 *   - `sharing === null` (or absent) means NOT KNOWN: the grant read failed,
 *     there is no verified caller, or the card is the caller's own. Not pickable.
 *   - otherwise a person is pickable only when `sharing.grantedCategories`
 *     contains "prism". The server already applied liveness (granted, not
 *     revoked, not expired, stored as JSON true) before putting a category in
 *     that list; this file does NOT re-derive it from `state`, `expiresAt` or
 *     anything else. One rule, in one service.
 *
 * This is a visibility rule in the browser, not a security boundary. Whether
 * the server refuses a not-shared person's scores is decided by growth-service
 * (`tds_prism_grant_gate`, dark by default) — see the PR that added this file.
 */

/**
 * The wire shape of `RosterMember.sharing` (growth-service `RosterSharing`),
 * declared here rather than on `RosterMember` so this package does not edit the
 * shared roster type another package is changing. Every field is read
 * defensively: it is a server response.
 */
type RosterSharingWire = {
  state?: unknown
  grantedCategories?: unknown
} | null

/** True only when the server says this person shares PRISM with the caller now. */
export function sharesPrismWithCaller(member: RosterMember): boolean {
  const sharing = (member as RosterMember & { sharing?: RosterSharingWire }).sharing
  if (!sharing || typeof sharing !== "object") return false
  const granted = sharing.grantedCategories
  return Array.isArray(granted) && granted.includes("prism")
}

/** Thrown when an id outside the pickable set reaches a run or a save. */
export class NotSharedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "NotSharedError"
  }
}

export type TeamCast = {
  port: SubjectListPort
  /** Resolves only pickable ids; any other id rejects with NotSharedError. */
  resolve: (ids: string[]) => Promise<StudioSubject[]>
  /** Ids that may be picked: PRISM on file AND shared with the caller. */
  pickableIds: string[]
  isPickable: (id: string) => boolean
  /** People with PRISM on file who are left out because it is not shared (or not known). */
  notShared: number
  /** People left out because they have no PRISM on file at all. */
  withoutPrism: number
}

export function useTeamCast(notSharedMessage: string): TeamCast {
  const cast = useStudioCast()
  const roster = useTeamDevelopmentRoster()

  const pickable = useMemo(() => {
    const ids = new Set<string>()
    for (const m of roster.data ?? []) {
      if (m.coverage.prism && sharesPrismWithCaller(m)) ids.add(m.memberId)
    }
    return ids
  }, [roster.data])

  const withPrismCount = useMemo(
    () => (roster.data ?? []).filter((m) => m.coverage.prism).length,
    [roster.data],
  )

  const isPickable = useCallback((id: string) => pickable.has(id), [pickable])
  const pickableIds = useMemo(() => Array.from(pickable), [pickable])

  const port: SubjectListPort = {
    subjects: cast.port.subjects?.filter((s) => pickable.has(s.id)),
    isLoading: cast.port.isLoading,
    error: cast.port.error,
  }

  const castResolve = cast.resolve
  const resolve = useCallback(
    async (ids: string[]) => {
      // Checked BEFORE any dossier or profile read, so a person who is not
      // pickable costs no request and no scores leave the server for them.
      if (ids.some((id) => !pickable.has(id))) throw new NotSharedError(notSharedMessage)
      return castResolve(ids)
    },
    [pickable, castResolve, notSharedMessage],
  )

  return {
    port,
    resolve,
    pickableIds,
    isPickable,
    notShared: withPrismCount - pickable.size,
    withoutPrism: cast.withoutPrism,
  }
}
