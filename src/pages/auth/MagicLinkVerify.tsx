import { useEffect, useRef } from "react"
import { useSearchParams, Link } from "react-router-dom"
import AuthLayout from "@/components/auth/AuthLayout"
import AuthHeader from "@/components/auth/AuthHeader"
import { useVerifyMagicLink } from "@/hooks/magic-auth/useMagicAuth"
import { useAuth } from "@/context/useAuth"
import type { LoginDataPayload } from "@/types/auth/api-types"
import type { MagicAuthUser } from "@/types/magic-auth"

export default function MagicLinkVerify() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const { completeAuthFromPayload } = useAuth()
  const mutation = useVerifyMagicLink()
  const attemptedRef = useRef(false)

  useEffect(() => {
    if (!token || attemptedRef.current) return
    attemptedRef.current = true

    mutation.mutate(
      { token },
      {
        onSuccess: async (resp) => {
          // Response may be { data: MagicAuthUser } or { access_token, user: {...} }
          const nested = resp?.data as MagicAuthUser | undefined
          const flat = resp as unknown as Record<string, unknown>
          const accessToken = nested?.access_token ?? (flat?.access_token as string | undefined)

          if (!accessToken) return

          // Extract user info from nested .data or flat .user object
          const userObj = (flat?.user ?? {}) as Record<string, unknown>
          const payload: LoginDataPayload = {
            access_token: accessToken,
            refresh_token: nested?.refresh_token ?? (flat?.refresh_token as string | null) ?? null,
            token_type: nested?.token_type ?? (flat?.token_type as string | null) ?? null,
            id_token: nested?.id_token ?? null,
            user_id: nested?.user_id ?? (userObj?.id as string | null) ?? null,
            email: nested?.email ?? (userObj?.email as string | null) ?? null,
            full_name: nested?.full_name ?? (userObj?.full_name as string | null) ?? null,
            role: nested?.role ?? (userObj?.role as string | null) ?? null,
            is_onboarded: nested?.is_onboarded ?? true,
            organization_id: nested?.organization_id ?? (userObj?.company_id as string | null) ?? null,
            business_id: nested?.business_id ?? null,
          }
          const email = payload.email ?? nested?.email ?? (userObj?.email as string) ?? ""
          await completeAuthFromPayload(payload, email, {
            message: "Signed in successfully",
          })
        },
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  if (mutation.isError) {
    return (
      <AuthLayout>
        <AuthHeader title="Verification Failed" subtitle="This magic link is invalid or expired" />
        <p className="text-sm text-muted-foreground text-center mt-4">
          <Link className="underline" to="/login">Request a new magic link</Link>
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="text-center space-y-4">
        <AuthHeader title="Verifying..." subtitle="Please wait while we sign you in" />
        <div className="animate-spin mx-auto size-8 border-4 border-teal-200 border-t-teal-600 rounded-full" />
      </div>
    </AuthLayout>
  )
}
