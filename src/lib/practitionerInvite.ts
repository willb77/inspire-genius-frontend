/**
 * PI-4 S6 — the practitioner invite token, between `/signup#invite=<token>`
 * and the signed-in claim (S7).
 *
 * CSA `docs/analysis/2026-11-07-practitioner-invite-links-csa.md` §2.3, D8:
 * the token rides in the URL FRAGMENT so it never reaches CloudFront, a CDN
 * log, `Referer` or the engine's access log. Here it is moved out of the
 * address bar into **sessionStorage only** (this tab, gone when it closes) and
 * the fragment is cleared with `history.replaceState`.
 *
 * Never localStorage. Never a query string. Nothing here sends it anywhere —
 * the only reader is the claim, which runs after sign-in.
 */

/** sessionStorage key. Exported for tests; nothing else should read it. */
export const INVITE_STORAGE_KEY = "ig:practitioner-invite"

/** `secrets.token_urlsafe(32)` is 43 chars of [A-Za-z0-9_-]; allow some slack. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{16,256}$/

/** The `invite` value in a `#a=b&invite=...` fragment, or null. */
export function inviteFromHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash
  if (!raw) return null
  const value = new URLSearchParams(raw).get("invite")
  return value === null ? null : value.trim()
}

/**
 * If the current URL's fragment carries `invite=`, store a well-formed token in
 * sessionStorage and strip the fragment from the address bar. Returns true
 * only when a token was stored.
 *
 * With no `invite=` in the fragment it touches nothing — a plain `/signup` is
 * exactly as it was.
 */
export function captureInviteFromLocation(
  loc: Pick<Location, "hash" | "pathname" | "search"> = window.location,
  hist: Pick<History, "replaceState" | "state"> = window.history,
): boolean {
  const token = inviteFromHash(loc.hash)
  if (token === null) return false
  // Clear the fragment whatever the token looks like: a malformed link must
  // not leave its contents in the address bar either.
  try {
    hist.replaceState(hist.state, "", `${loc.pathname}${loc.search}`)
  } catch {
    /* a sandboxed frame may refuse; storing below still happens */
  }
  if (!TOKEN_SHAPE.test(token)) return false
  try {
    sessionStorage.setItem(INVITE_STORAGE_KEY, token)
    return true
  } catch {
    // Storage unavailable (private mode): the invite cannot survive sign-up.
    // The practitioner's code (Settings) is the fallback.
    return false
  }
}

/** The stored token, or null. */
export function readStoredInvite(): string | null {
  try {
    const v = sessionStorage.getItem(INVITE_STORAGE_KEY)
    return v && TOKEN_SHAPE.test(v) ? v : null
  } catch {
    return null
  }
}

/** Forget the token — after the claim settles, whatever it came to. */
export function clearStoredInvite(): void {
  try {
    sessionStorage.removeItem(INVITE_STORAGE_KEY)
  } catch {
    /* nothing to clear */
  }
}
