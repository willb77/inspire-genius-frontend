/**
 * History "review" selection — what the chat sends, and what the banner may claim.
 *
 * From FE #133 (2026-06-12) until 2026-10-02 the History checkbox only set page
 * state: no send path carried it, yet a banner said "Reviewing 1 additional
 * conversation alongside the active chat." Meridian, correctly, said it saw no
 * selected conversation. The selection is now sent as
 * `context.review_conversation_ids`, and the banner states only what the server
 * confirmed in the reply's `metadata.referenced_conversation_ids`.
 */

/** The agent-engine loads at most this many referenced conversations per turn. */
export const MAX_REVIEW_CONVERSATIONS = 3

/** Spread into a chat request's `context`. Empty selection adds nothing, so the
 * request body is unchanged for everyone who has not ticked a conversation. */
export function reviewContext(ids: readonly string[]): { review_conversation_ids?: string[] } {
  const clean = Array.from(new Set(ids.filter((id) => typeof id === "string" && id.trim() !== "")))
  return clean.length > 0 ? { review_conversation_ids: clean.slice(0, MAX_REVIEW_CONVERSATIONS) } : {}
}

/** What the last settled turn sent and what the server says it loaded. */
export type ReviewOutcome = { sent: string[]; loaded: string[] }

export type ReviewBannerState =
  | { kind: "none" }
  /** Ticked, but no message has been sent with this selection yet. */
  | { kind: "pending"; count: number }
  /** The server loaded every selected conversation. */
  | { kind: "loaded"; count: number }
  /** The server loaded some or none of them. */
  | { kind: "missing"; count: number; missing: number }

export function reviewBannerState(
  selected: readonly string[],
  outcome: ReviewOutcome | null,
): ReviewBannerState {
  if (selected.length === 0) return { kind: "none" }
  if (!outcome) return { kind: "pending", count: selected.length }
  const loaded = new Set(outcome.loaded.map((id) => id.toLowerCase()))
  const missing = selected.filter((id) => !loaded.has(id.toLowerCase())).length
  if (missing === 0) return { kind: "loaded", count: selected.length }
  return { kind: "missing", count: selected.length, missing }
}

/** Read the server's confirmation off a reply's metadata, defensively. */
export function loadedReviewIds(metadata: unknown): string[] {
  const ids = (metadata as { referenced_conversation_ids?: unknown } | null | undefined)
    ?.referenced_conversation_ids
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []
}
