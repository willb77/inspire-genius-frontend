import { api } from "@/lib/axios"

/**
 * Per-user activity for the super-admin User Management "Activity" action.
 *
 * Reads `GET /v1/audit/users/{id}/activity` (audit-service, exposed through the
 * `GET /v1/audit/{proxy+}` gateway route), which is gated to super-admin and
 * company-admin exactly like `/v1/audit/logs`.
 *
 * WHAT IS AND IS NOT REAL — this drove the shape of the type:
 *   - last login, IP and user-agent ARE recorded, on `auth.user.login` rows.
 *   - the older bare `login` rows carry an actor and a timestamp but NO IP and
 *     NO user-agent, so those fields are legitimately null for older logins.
 *   - LOCATION IS NOT RECORDED ANYWHERE. `audit_logs` has an IP column and no
 *     geo/country/city column on either tier. There is deliberately no
 *     `location` field here; the backend sends `locationRecorded: false` and the
 *     UI shows the IP and says location is not recorded, rather than inferring a
 *     city from an address via a geo-IP dependency nobody has agreed to.
 */
export type UserActivityEvent = {
  id: string
  at: string | null
  action: string
  description?: string | null
  /** null means NOT CAPTURED for that event, not "unknown address". */
  ipAddress?: string | null
  userAgent?: string | null
}

export type UserActivity = {
  userId: string
  /** null = this user has never logged in. Not a missing value — an absent one. */
  /** The most recent sign-in that actually recorded an address, when the
   *  latest sign-in did not.
   *
   *  Absent when `lastLogin` already carries an IP — the two must never show
   *  the same address twice. It carries its OWN timestamp because it is a
   *  DIFFERENT sign-in: presenting it as the latest one's address would answer
   *  "where did they sign in from this time?" confidently and wrongly. */
  lastKnownIp?: { ipAddress: string; at: string } | null
  lastLogin: {
    at: string | null
    ipAddress?: string | null
    userAgent?: string | null
    action: string
  } | null
  loginCount: number
  /** Always false today. Present so the UI states the limitation explicitly. */
  locationRecorded: boolean
  activity: UserActivityEvent[]
}

/**
 * Throws on failure rather than returning an empty shape.
 *
 * An empty `activity: []` with `lastLogin: null` is indistinguishable from a
 * real user who has never signed in — so a failed request that degraded to that
 * would read as "this account has never been used", which is a much more
 * alarming and completely fabricated claim. The caller renders the error.
 */
export async function getUserActivity(
  userId: string,
  limit = 20,
): Promise<UserActivity> {
  const r = await api.get<{ data: UserActivity }>(
    `/v1/audit/users/${encodeURIComponent(userId)}/activity`,
    { params: { limit } },
  )
  return r.data.data
}
