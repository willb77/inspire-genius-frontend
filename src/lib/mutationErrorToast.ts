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
 *
 * ## Why this is opt-IN, for now
 *
 * The obvious shape — toast everything that has no `onError` — was built first
 * and measured against the codebase before shipping. It double-toasts. **77
 * catch blocks across 36 files** already `await mutateAsync(...)` inside a
 * `try/catch` and toast in the surface's own words, and React Query gives the
 * cache callback no way to tell `mutate` from `mutateAsync` — both route
 * through the same `execute`, so the global handler fires whether or not the
 * caller caught. On those paths the user would see the specific message and
 * then a generic one; on three interview surfaces, a third report as an error
 * card. "Could not save that rating" twice does not read as thoroughness, it
 * reads as two failures.
 *
 * The affected files span AuthContext, Documents, Character Lab, Honor,
 * Broadcast and Interview Studio — nearly every lane, several with live PRs.
 * Annotating them all in this change would mean a wide cross-lane diff to serve
 * one addition.
 *
 * So the net starts opt-in: a hook declares `meta: { surfaceError: true }` when
 * it has no error handling of its own and no caller doing it either. The
 * follow-up audits those 36 files, adds `meta: { quietError: true }` where the
 * caller already speaks, and flips this default to opt-out — at which point all
 * ~219 fire-and-forget `.mutate()` sites are covered with no doubling.
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
 * Quiet unless the hook has explicitly asked to be covered. Three reasons a
 * mutation stays silent, in the order they are checked:
 *
 * 1. **It did not opt in.** The default, until the audit described above lands.
 * 2. **The mutation owns its errors.** An `onError` on the hook wins even over
 *    an explicit opt-in: it has already said whatever it wants to say, and a
 *    second toast would contradict a tailored message. Checked separately from
 *    the opt-in so that adding `onError` later cannot silently produce doubles.
 * 3. **A 401.** `src/lib/axios.ts` owns that path — single-flight refresh, retry,
 *    and logout on a second failure. Session expiry legitimately produces 401s
 *    across every in-flight request at once, so toasting here turns one expiry
 *    into a pile of identical toasts stacked over the login redirect.
 *
 * `meta: { quietError: true }` is honoured now so the audit can annotate hooks
 * ahead of the flip, and so a hook that opts in cannot be made noisy by a
 * caller that already handles it.
 */
export function shouldStayQuiet(
  error: unknown,
  mutation?: Pick<Mutation<unknown, unknown, unknown, unknown>, "options">,
): boolean {
  if (mutation?.options?.onError) return true
  if (mutation?.options?.meta?.quietError) return true
  if (!mutation?.options?.meta?.surfaceError) return true
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
