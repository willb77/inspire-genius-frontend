import type { KnownVertical } from "@/types/grant"
import { useEnabledVerticals } from "./useEnabledVerticals"

export type VerticalAccess = {
  /** True once entitlement has resolved and the vertical is enabled (or a dev override is set). */
  hasAccess: boolean
  /** True while the entitlement read is still loading. */
  isLoading: boolean
  /** The raw enabled-verticals list from the server entitlement read. */
  enabledVerticals: string[]
}

/** localStorage key for the dev/eyeball access override. */
export const DEV_ACCESS_KEY = "grant_dev_access"

/**
 * Dev/eyeball shortcut: set `localStorage.grant_dev_access = "true"` (then
 * reload) to force vertical access on, independent of the server entitlement.
 * Intended for previewing a vertical in-browser before real entitlement rows
 * exist. Opt-in, per-browser, never on by default.
 */
function hasDevOverride(): boolean {
  if (typeof window === "undefined") return false
  try {
    return window.localStorage.getItem(DEV_ACCESS_KEY) === "true"
  } catch {
    return false
  }
}

/**
 * Entitlement gate for a vertical pack.
 *
 * Reads the current user's enabled verticals from the server
 * (`GET /v1/agents/me/verticals`, via {@link useEnabledVerticals}) and returns
 * whether they're entitled to the given vertical. Absent entitlement →
 * `hasAccess: false` (routes redirect, nav hidden).
 *
 * The dev override (`localStorage.grant_dev_access`) forces access on for
 * in-browser preview before real entitlement rows are seeded.
 *
 * Simplified vertical model: entitlement is a plain server-read list — no Pack
 * SDK / Cognito PTG.
 */
export function useVerticalAccess(vertical: KnownVertical): VerticalAccess {
  const { data, isLoading } = useEnabledVerticals()
  const enabledVerticals = data ?? []
  const devOverride = hasDevOverride()
  return {
    hasAccess: devOverride || enabledVerticals.includes(vertical),
    isLoading: devOverride ? false : isLoading,
    enabledVerticals,
  }
}
