/**
 * Honest rendering of authorization refusals on the Knowledge Continuity routes.
 *
 * The trainer-service continuity routes will refuse a caller outside the
 * organisation that owns a row with a 403. Without this, a refused list reads
 * as an empty one ("no saved roles", "all caught up"), which is
 * indistinguishable from a tool nobody has used yet. Every KCE surface checks
 * `isKceAccessDenied` before falling back to its generic error or empty state.
 */

export const KCE_ACCESS_DENIED_MESSAGE =
  "You don't have access to this organisation's knowledge."

/**
 * Sent where the current backend still requires an identity field in the body.
 * The browser has no real user id to send (the auth context's `user.id` is a
 * placeholder), so the server is the only party that can stamp who acted.
 */
export const KCE_SELF_IDENTITY = "self"

type MaybeHttpError = {
  response?: { status?: number; data?: { detail?: unknown } }
}

/** HTTP status of an axios-shaped error, if it has one. */
export function kceErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined
  return (error as MaybeHttpError).response?.status
}

/** The server's `detail`, when it is a plain string. */
export function kceErrorDetail(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined
  const detail = (error as MaybeHttpError).response?.data?.detail
  return typeof detail === "string" ? detail : undefined
}

/** True when the server refused the caller (403). */
export function isKceAccessDenied(error: unknown): boolean {
  return kceErrorStatus(error) === 403
}

/** The message to show for a failed KCE call: the access notice on 403, else `fallback`. */
export function kceErrorMessage(error: unknown, fallback: string): string {
  return isKceAccessDenied(error) ? KCE_ACCESS_DENIED_MESSAGE : fallback
}
