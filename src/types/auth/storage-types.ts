// Auth storage related types

export type StoredUser = {
  id?: string
  email: string
  name?: string | null
  fullName?: string | null
  role?: string
  token?: string // access token (duplicate for backward compatibility)
  accessToken?: string
  refreshToken?: string
  isOnboardingCompleted?: boolean
  userId?: string | null
  organizationId?: string | null
  businessId?: string | null
  tokenType?: string | null
  idToken?: string | null
}
