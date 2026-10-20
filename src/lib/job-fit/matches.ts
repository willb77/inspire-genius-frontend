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
