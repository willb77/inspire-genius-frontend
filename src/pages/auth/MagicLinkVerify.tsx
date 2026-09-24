import { useEffect, useRef, useState } from "react"
import { useSearchParams, Link, useNavigate } from "react-router-dom"
import AuthLayout from "@/components/auth/AuthLayout"
import AuthHeader from "@/components/auth/AuthHeader"
import { useVerifyMagicLink } from "@/hooks/magic-auth/useMagicAuth"
import { useAuth } from "@/context/useAuth"
import { getToken } from "@/lib/storage"
import { ROUTES } from "@/constants/routes"
import type { LoginDataPayload } from "@/types/auth/api-types"

export default function MagicLinkVerify() {
  const [params] = useSearchParams()
  const token = params.get("token") ?? ""
  const { completeAuthFromPayload } = useAuth()
  const navigate = useNavigate()
  const mutation = useVerifyMagicLink()
  const attemptedRef = useRef(false)
  const [signedInElsewhere, setSignedInElsewhere] = useState(false)

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
          // Honor standalone entry stashes a post-auth intent so a coach who
          // signed in from /honor lands in the workbench, not the generic home.
          // Additive: only fires when that key is present (the Honor entry sets it).
          try {
            const intent = localStorage.getItem("ig_post_auth_redirect")
            if (intent) {
              localStorage.removeItem("ig_post_auth_redirect")
              window.location.assign(intent)
            }
          } catch {
            /* ignore storage failures */
          }
        },
      }
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // A sign-in link is single-use, so the SAME link can verify twice: a second
  // tab, a double click, or a mail scanner fetching the URL. The first call
  // signs the person in and the second comes back 400 ("jti replay"). Showing
  // "Verification Failed" then strands somebody whose session is actually live,
  // and they go round the houses — re-clicking the dead link, trying Sign up,
  // trying Google. If a token is already stored, the sign-in landed: send them
  // on. Login forwards an authenticated visitor to their own home, so this
  // stays role-agnostic. A stale token just lands them on /login, which is
  // where they'd want to be anyway.
  useEffect(() => {
    if (!mutation.isError) return
    let cancelled = false
    void (async () => {
      try {
        const existing = await getToken()
        if (!cancelled && existing) {
          setSignedInElsewhere(true)
          navigate(ROUTES.LOGIN, { replace: true })
        }
      } catch {
        /* storage unavailable — fall through to the failure screen */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mutation.isError, navigate])

  if (mutation.isError && !signedInElsewhere) {
    return (
      <AuthLayout>
        <AuthHeader
          title="This sign-in link has expired"
          subtitle="Sign-in links work once, and only for 15 minutes"
        />
        <p className="text-sm text-muted-foreground text-center mt-4">
          If you already opened this link, it has been used. Older emails
          won&rsquo;t work either — request a fresh one and use the newest email.
        </p>
        <p className="text-sm text-center mt-4">
          <Link className="underline" to={ROUTES.LOGIN}>Send me a new sign-in link</Link>
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
