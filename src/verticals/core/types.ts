// IG Vertical Core — shared types.
//
// Every vertical speaks these. Domain types stay in the vertical
// (`@/types/grant`); only what Core itself defines lives here.

/**
 * Stable identifier for a vertical.
 *
 * This one string is the entitlement value in `user_entitlements.verticals`,
 * the API prefix segment (`/v1/agents/{key}`), and the route segment
 * (`/vertical/{key}`). Changing it later means a data migration — choose once.
 *
 * Kept as a union rather than `string` so a typo in a route guard or an
 * entitlement check is a compile error, not a silently closed gate.
 */
export type VerticalKey = "grant" | "honor" | "job-fit" | "knowledge-continuity"

/**
 * The envelope every vertical endpoint returns.
 *
 * Mirrors the platform `BaseApiResponse` shape. Backend counterpart:
 * `ok()` in `app/verticals/core/envelope.py`.
 */
export type VerticalApiResponse<T = unknown> = {
  status?: boolean
  success?: boolean
  message?: string
  data?: T
}

/** Entitlement slice of a user profile. */
export type UserPreferences = {
  /** Vertical keys this user may see. */
  enabled_verticals?: string[]
}

export type MeProfile = {
  id?: string
  email?: string
  user_preferences?: UserPreferences
}
