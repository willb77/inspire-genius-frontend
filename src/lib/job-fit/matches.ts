// The fit-matches envelope, read the same way by every surface that lists
// matches (Career Fit and Direction Setting).
//
// GET /v1/blueprint/fit/matches answers with `{ data: FitMatch[], gated }`
// (blueprint-service `FitMatchesResponse`). `gated` sits on the envelope, not
// in the rows, so a read that keeps only `data` cannot tell "matching is
// switched off" from "there are no roles to match against" — two different
// truths that deserve different words.

import type { FitMatch } from "@/types/job-fit"

/**
 * The envelope as it may arrive. Older/other reads return a bare array in
 * `data`; the gate can come back either at the envelope level or wrapped around
 * the rows. Both shapes are read here rather than asserted, so a contract that
 * differs from the one we expect degrades to "not gated, no rows" instead of
 * throwing in the user's face.
 */
export type MatchesEnvelope = {
  data?: FitMatch[] | { matches?: FitMatch[]; gated?: boolean }
  gated?: boolean
}

export type MatchesResult = {
  matches: FitMatch[]
  /** True when role matching is switched off platform-side, not merely empty. */
  gated: boolean
}

/**
 * JF-14b — does this list come from an organisation's local job set with at
 * least one of its own roles in it? The server sends `jobSet` only while the
 * caller's job set applies, so a `local` row is the whole signal: no envelope
 * field is needed. A list that is all `national` (an org listed for a job set
 * that owns no ranked role) is false — both orders are the same list there, so
 * a choice between them would be a control that does nothing.
 */
export function hasLocalJobSet(matches: readonly FitMatch[] | undefined): boolean {
  return (matches ?? []).some((m) => m.jobSet === "local")
}

/** Pull rows + gate out of whichever envelope shape came back. */
export function normalizeMatches(body: MatchesEnvelope | undefined): MatchesResult {
  const payload = body?.data
  if (Array.isArray(payload)) {
    return { matches: payload, gated: body?.gated === true }
  }
  return {
    matches: payload?.matches ?? [],
    gated: body?.gated === true || payload?.gated === true,
  }
}
