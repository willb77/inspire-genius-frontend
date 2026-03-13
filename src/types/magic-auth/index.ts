export type RequestMagicLinkPayload = {
  email: string
}

export type VerifyMagicLinkPayload = {
  token: string
}

export type MagicAuthUser = {
  user_id: string
  email: string
  full_name?: string | null
  role?: string | null
  is_onboarded?: boolean | string | null
  access_token: string
  refresh_token?: string | null
  token_type?: string | null
  id_token?: string | null
  organization_id?: string | null
  business_id?: string | null
}

export type RequestOtpPayload = {
  email: string
}

export type VerifyOtpPayload = {
  email: string
  otp: string
}
