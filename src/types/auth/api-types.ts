export type LoginNextStep = 'verify_mfa' | 'create_profile' | string

export interface LoginDataPayload {
  session?: string | null
  access_token?: string | null
  refresh_token?: string | null
  id_token?: string | null
  token_type?: string | null
  user_id?: string | null
  email?: string | null
  full_name?: string | null
  role?: string | null
  has_profile?: boolean | null
  is_onboarded?: boolean | string | null
  organization_id?: string | null
  business_id?: string | null
  mfa_required?: boolean | null
  next_step?: LoginNextStep | null
}

export interface ApiEnvelope<T = unknown> {
  message?: string
  status?: boolean
  success?: boolean
  error_status?: {
    error_code?: string
    description?: string
  }
  data?: T
}
