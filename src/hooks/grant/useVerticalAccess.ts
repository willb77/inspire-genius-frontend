import { useMe } from "@/hooks/user/useMe"
import type { KnownVertical, MeProfile } from "@/types/grant"

export type VerticalAccess = {
  /** True once the profile has loaded and the vertical is in enabled_verticals. */
  hasAccess: boolean
  /** True while the /v1/me profile is still loading. */
  isLoading: boolean
  /** The raw entitlement list from user_preferences.enabled_verticals. */
  enabledVerticals: string[]
}

/**
 * Entitlement gate for a vertical pack.
 *
 * Reads `user_preferences.enabled_verticals` from the `/v1/me` profile and
 * returns whether the current user is entitled to the given vertical.
 * Absent entitlement → `hasAccess: false` (routes redirect, nav hidden).
 *
 * Follows the simplified vertical model: entitlement is a frontend-only read
 * of a user-preferences list — no Pack SDK / Cognito PTG.
 */
export function useVerticalAccess(vertical: KnownVertical): VerticalAccess {
  const { data, isLoading } = useMe<MeProfile>()
  const enabledVerticals = data?.data?.user_preferences?.enabled_verticals ?? []
  return {
    hasAccess: enabledVerticals.includes(vertical),
    isLoading,
    enabledVerticals,
  }
}
