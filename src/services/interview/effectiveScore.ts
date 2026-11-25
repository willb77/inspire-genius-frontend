/**
 * The score an answer COUNTS AS in the interview roll-up.
 *
 * The server applies the STAR Result cap when it scores: a rated answer above 3
 * with no measurable Result observed counts as 3 toward the section and overall
 * scores. The interviewer's rating (`final_score`) is stored unchanged, and the
 * server says the cap applied by returning `capped: {applied: true, reason}` on
 * the answer (PATCH, GET detail and finalize all return it).
 *
 * This module only READS that verdict — it never decides whether a Result was
 * observed. It exists so that every place a per-answer or running score is
 * shown agrees with the overall the server stored, and can say why a 4 counted
 * as 3.
 *
 * Two rules, both the server's:
 *  - Read `capped.applied`, never `capped`: the wire shape is an object, and an
 *    object is truthy whichever way `applied` points (see `CappedInfo`).
 *  - A CUSTOM session (`frame.mode === "custom"`, Interview Studio) is scored
 *    with the cap disabled. Before 2026-09-14 the rating step ignored the frame
 *    and stamped `capped.applied` on custom answers anyway, while finalize never
 *    capped them, so a stored stamp on a custom answer is stale and must not be
 *    reported as having lowered the score.
 */
import type { CappedInfo } from "@/services/interview/live.service"

/** STAR Result cap — mirrors the server's `result_cap` for STAR sessions. */
export const RESULT_CAP = 3

/** The server's reason string for the Result cap. */
export const CAP_REASON_NO_RESULT = "no_measurable_result"

export type ScoreableAnswer = {
  final_score?: number | null
  capped?: CappedInfo | null
}

/** The session's `frame.mode`; absent means STAR, as on the server. */
export type ScoringMode = string | null | undefined

/** Whether a session of this mode scores with the Result cap at all. */
export function capAppliesToMode(mode: ScoringMode): boolean {
  return String(mode ?? "star").trim().toLowerCase() !== "custom"
}

/** True only when the server says the cap applied AND this session scores with it. */
export function isCapped(a: ScoreableAnswer | null | undefined, mode?: ScoringMode): boolean {
  return capAppliesToMode(mode) && a?.capped?.applied === true
}

/**
 * The score this answer counts as: the rating, or the cap when it applied.
 * Null when there is no numeric rating.
 */
export function effectiveScore(a: ScoreableAnswer | null | undefined, mode?: ScoringMode): number | null {
  const s = a?.final_score
  if (typeof s !== "number") return null
  return isCapped(a, mode) ? Math.min(s, RESULT_CAP) : s
}

/**
 * The running tally: how many answers carry a saved rating, and the mean of
 * the scores they COUNT AS — the same rule the server applies at finalize.
 */
export function runningTally(
  scored: ReadonlyArray<ScoreableAnswer | null | undefined>,
  mode?: ScoringMode,
): { count: number; avg: number | null } {
  const counted = scored.map((a) => effectiveScore(a, mode)).filter((s): s is number => s !== null)
  if (counted.length === 0) return { count: 0, avg: null }
  return { count: counted.length, avg: counted.reduce((sum, s) => sum + s, 0) / counted.length }
}
