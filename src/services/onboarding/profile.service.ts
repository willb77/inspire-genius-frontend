import { api } from '@/lib/axios'

export type CreateProfilePayload = {
  first_name: string
  last_name: string
  date_of_birth: string // yyyy-mm-dd
  additional_info?: string
  role_id?: string
  gender?: string
  ethnicity?: string
  cultural_affinity?: string
}

export type CreateProfileResponse = {
  status?: boolean
  success?: boolean
  message?: string
  data?: unknown
}

/**
 * Create the signed-in user's profile during onboarding.
 *
 * Same endpoint as {@link updateProfile}, and for the same reason — the
 * monolith route it used to POST to does not exist in microservices-only
 * environments. The backend upserts on `uq_user_profiles_user_id`, so create
 * and update are genuinely one operation; splitting them would only add a way
 * for the two to disagree.
 *
 * The response envelope differs from the monolith's (`{data}` rather than
 * `{status, message, data}`). `useCreateProfileMutation` treats a missing
 * `status`/`success` as success — it only fails on an explicit `false` — so
 * the contract still holds.
 */
export async function createProfile(payload: CreateProfilePayload): Promise<CreateProfileResponse> {
  const { data } = await api.put<CreateProfileResponse>('/v1/users/me/profile', payload)
  return data
}

/**
 * Save the signed-in user's own profile.
 *
 * Points at user-service (`PUT /v1/users/me/profile`), NOT the monolith's
 * `PUT /v1/onboarding/profile` it used to call.
 *
 * That monolith route only exists where a monolith is running — it is reached
 * through a Strangler-Fig catch-all CDK wraps in `if (isLegacyEnv)`. staging-b
 * is microservices-only, so the call 404'd there; and because API Gateway's
 * default 404 carries no CORS header, the browser refused to surface the
 * status and axios reported a bare "Network Error". Saving your profile failed
 * with a message pointing at the network instead of at a missing route.
 *
 * `ANY /v1/users/{proxy+}` is already routed in BOTH environments, so this
 * needed no API Gateway change. There is no user id in the path on purpose:
 * the subject is the token's own `sub`, so this can only write the caller's
 * own row.
 */
export async function updateProfile(payload: CreateProfilePayload): Promise<CreateProfileResponse> {
  const { data } = await api.put<CreateProfileResponse>('/v1/users/me/profile', payload)
  return data
}
