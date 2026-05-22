import { useEffect, useRef } from "react"
import { useSearchParams, Link } from "react-router-dom"
import AuthLayout from "@/components/auth/AuthLayout"
import AuthHeader from "@/components/auth/AuthHeader"
import { useVerifyMagicLink } from "@/hooks/magic-auth/useMagicAuth"
import { useAuth } from "@/context/useAuth"
import type { LoginDataPayload } from "@/types/auth/api-types"

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
          const payload = resp?.data as LoginDataPayload | undefined
          if (!payload?.access_token) return
          const email = payload.email ?? ""
          await completeAuthFromPayload(payload, email, {
            message: resp?.message ?? "Signed in successfully",
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
