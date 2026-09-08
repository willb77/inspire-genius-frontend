import type { Mutation } from "@tanstack/react-query"
import { apiErrorMessage } from "@/lib/apiErrorMessage"

/**
 * The safety net for writes that fail with nobody watching.
 *
 * ## Why this exists
 *
 * `useMutation` reports a rejection to whoever wrote the hook, and to nobody
 * else. Measured on 2026-09-08: **469 `useMutation` call sites, 59 files
 * defining an `onError`.** The rest fail in silence — the button un-disables,
 * the spinner stops, and the surface looks exactly as it does on success.
 *
 * That is worse than a visible error. Two of them cost real time the day this
 * was written:
 *
 *   - `applyStaged` in the Team Development Studio clears the proposed action
 *     unconditionally after firing `.mutate()`. A failed apply removed the card
 *     and said nothing, which reads as "done".
 *   - `useRefreshDossier` fires a recompute with no `onError`. When a click did
 *     not reach the backend, the button spun, stopped, and reported success by
 *     omission — so "I recomputed it" and "no request arrived" were both true,
 *     and it took a Lambda event count to tell them apart.
 *
 * A global handler cannot fix a bad write path, and is not meant to. It makes
 * the failure *audible* so the next one is diagnosed in seconds instead of an
 * hour.
 */

/** Copy shown when the server gave us nothing a human should read. */
export const FALLBACK_MESSAGE = "That didn't save. Please try again."

/**
 * Axios's own message for any non-2xx. Technically accurate, useless to a user,
 * and it would otherwise win over the fallback because it is a real `Error`.
 */
const AXIOS_BOILERPLATE = /^Request failed with status code \d+$/

type ErrorShape = {
  response?: { status?: number; data?: { message?: unknown } }
}

/**
 * Should the global net stay quiet about this rejection?
 *
 * Two cases, both deliberate:
 *
 * 1. **The mutation owns its errors.** If the hook passed an `onError`, it has
 *    already said whatever it wants to say; a second toast would be noise and
 *    would contradict hooks that deliberately show a tailored message.
 * 2. **A 401.** `src/lib/axios.ts` owns that path — single-flight refresh, retry,
 *    and logout on a second failure. Session expiry legitimately produces 401s
 *    across every in-flight request at once, so toasting here turns one expiry
 *    into a pile of identical toasts stacked over the login redirect.
 *
 * `meta: { quietError: true }` is the opt-out for genuinely background writes
 * whose failure the user cannot act on.
 */
export function shouldStayQuiet(
  error: unknown,
  mutation?: Pick<Mutation<unknown, unknown, unknown, unknown>, "options">,
): boolean {
  if (mutation?.options?.onError) return true
  if (mutation?.options?.meta?.quietError) return true
  return (error as ErrorShape)?.response?.status === 401
}

/**
 * The string to show. Never returns an object: sonner renders its argument as a
 * React child, and a raw FastAPI 422 `detail` array once took the page down with
 * React error #31 — see `apiErrorMessage`, which exists for that reason and is
 * reused here rather than reimplemented.
 */
export function mutationErrorMessage(error: unknown): string {
  const apiMessage = (error as ErrorShape)?.response?.data?.message
  if (typeof apiMessage === "string" && apiMessage.trim()) return apiMessage.trim()

  const resolved = apiErrorMessage(error, FALLBACK_MESSAGE)
  // `apiErrorMessage` falls back to `err.message` before its own fallback, and
  // for an axios error that is the boilerplate above — worse than saying nothing.
  if (!resolved.trim() || AXIOS_BOILERPLATE.test(resolved)) return FALLBACK_MESSAGE
  return resolved
}
