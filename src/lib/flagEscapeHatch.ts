/**
 * URL escape hatch for the client-side surface flags.
 *
 * WHY THIS EXISTS
 * ---------------
 * Two flags live only in `localStorage` and decide which app a user gets:
 *
 *   * `new_user_surfaces` — `"false"` pins them to the Classic pages
 *     (`src/lib/surfaceFlags.ts`).
 *   * `agent_engine_enabled` — `"false"` turns the sidebar's "Chat with
 *     Meridian" into "Chat with Coaches" and routes them to the old dashboard
 *     (`src/lib/agentApi.ts`).
 *
 * Both were switchable in-page until the toggles were removed (2026-08-06 for
 * surfaces, with the /home one). The *destinations* survived; the *switches*
 * did not. So a user carrying a stale `"false"` — set by the old toggle, by a
 * support session, or from the console — is pinned to the old app **with no way
 * back that they can reach**. `surfaceFlags.ts` says as much in its own comment:
 * "silently ignoring it would leave no way back short of a redeploy now that
 * the toggle is gone."
 *
 * That is not hypothetical. It is the leading explanation for a user who has an
 * entitlement, whose feature is deployed and whose data exists, reporting that
 * they cannot see it — the flag is per-browser and invisible to every
 * server-side check.
 *
 * WHAT THIS DOES
 * --------------
 * Reads flag overrides off the query string once, at boot, before any route
 * resolves. Support can now unstick someone with a link instead of talking them
 * through a console:
 *
 *   ?flags=reset                 clear every override (back to defaults)
 *   ?surfaces=new|classic|reset  set/clear new_user_surfaces
 *   ?agent_engine=on|off|reset   set/clear agent_engine_enabled
 *
 * The params are stripped from the URL afterwards, so a link pasted into chat
 * does not permanently re-apply itself on every navigation, and the address bar
 * does not carry flag state around.
 *
 * Deliberately NOT done: making a stored `"false"` expire, or ignoring it
 * outright. Both would silently override a choice someone made on purpose. The
 * problem was never that the override persists — it is that there was no way to
 * clear it.
 */

import { clearNewUserSurfaces, setNewUserSurfaces } from "@/lib/surfaceFlags"

const AGENT_ENGINE_KEY = "agent_engine_enabled"

/** What a single param asked for. */
type Directive = "on" | "off" | "reset" | null

function readDirective(params: URLSearchParams, name: string): Directive {
  const raw = params.get(name)
  if (raw === null) return null
  const v = raw.trim().toLowerCase()
  // Accept the vocabulary each flag reads naturally in a URL, so support does
  // not have to remember which one wants "new" and which wants "on".
  if (["on", "true", "1", "new", "yes"].includes(v)) return "on"
  if (["off", "false", "0", "classic", "no"].includes(v)) return "off"
  if (["reset", "clear", "default"].includes(v)) return "reset"
  return null
}

function setAgentEngine(directive: Exclude<Directive, null>): void {
  try {
    if (directive === "reset") localStorage.removeItem(AGENT_ENGINE_KEY)
    else localStorage.setItem(AGENT_ENGINE_KEY, directive === "on" ? "true" : "false")
  } catch {
    /* private mode / sandboxed storage — nothing to clear */
  }
}

/**
 * Apply any flag overrides present in the URL. Returns the list of changes made
 * (empty when the URL carried none), which is what the tests assert on.
 *
 * Safe to call unconditionally at boot: with no recognised params it touches
 * neither storage nor history.
 */
export function applyFlagOverridesFromUrl(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): string[] {
  const applied: string[] = []
  if (!search) return applied

  let params: URLSearchParams
  try {
    params = new URLSearchParams(search)
  } catch {
    return applied
  }

  const resetAll = readDirective(params, "flags") === "reset"
  if (resetAll) {
    clearNewUserSurfaces()
    setAgentEngine("reset")
    applied.push("new_user_surfaces=reset", "agent_engine_enabled=reset")
  }

  const surfaces = readDirective(params, "surfaces")
  if (surfaces === "reset") {
    clearNewUserSurfaces()
    applied.push("new_user_surfaces=reset")
  } else if (surfaces === "on" || surfaces === "off") {
    setNewUserSurfaces(surfaces === "on")
    applied.push(`new_user_surfaces=${surfaces === "on"}`)
  }

  const agentEngine = readDirective(params, "agent_engine")
  if (agentEngine) {
    setAgentEngine(agentEngine)
    applied.push(
      agentEngine === "reset"
        ? "agent_engine_enabled=reset"
        : `agent_engine_enabled=${agentEngine === "on"}`,
    )
  }

  if (applied.length) {
    // Visible confirmation for whoever is on the phone with the user.
    console.info("[flags] applied from URL:", applied.join(", "))
    stripFlagParams(params)
  }

  return applied
}

/**
 * Remove the flag params from the address bar without reloading.
 *
 * Without this, a link like `?flags=reset` stays in history: the user bookmarks
 * it, shares it, and re-applies a reset every time they open the app. The flags
 * have already been written to storage by the time this runs, so dropping them
 * from the URL loses nothing.
 */
function stripFlagParams(params: URLSearchParams): void {
  try {
    if (typeof window === "undefined" || !window.history?.replaceState) return
    for (const key of ["flags", "surfaces", "agent_engine"]) params.delete(key)
    const qs = params.toString()
    const next = window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash
    window.history.replaceState({}, "", next)
  } catch {
    /* history unavailable — the flags still applied, only the URL is untidy */
  }
}
