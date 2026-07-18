import { useState } from "react"
import { Navigate } from "react-router-dom"
import { Shield, Mail, Loader2, ArrowRight } from "lucide-react"
import { useAuth } from "@/context/useAuth"
import { useRequestMagicLink } from "@/hooks/magic-auth/useMagicAuth"
import { ROUTES } from "@/constants/routes"

/**
 * The Honor Foundation — standalone Coach Workbench entry.
 *
 * A directly-openable, THF-branded front door so coaches reach the workbench
 * without going through the general IG login. It REUSES the platform's magic-link
 * auth (`useRequestMagicLink` → the same `/v1/magic-link/*` flow every IG surface
 * uses) — no bespoke auth. On success the emailed link signs the user in through
 * `/magic-verify`; we stash a post-auth intent so that verify lands them straight
 * in the Honor dashboard. An already-authenticated visitor is forwarded
 * immediately.
 *
 * Wrapped in `.vertical-honor` so the navy/orange reskin tokens apply here and
 * never leak into the rest of the app.
 */

export const HONOR_POST_AUTH_KEY = "ig_post_auth_redirect"

export default function HonorLanding() {
  const { user } = useAuth()
  const requestLink = useRequestMagicLink()
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)

  // Already signed in → straight into the workbench.
  if (user) return <Navigate to={ROUTES.HONOR.DASHBOARD} replace />

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const value = email.trim().toLowerCase()
    if (!value) return
    // Stash the intent so /magic-verify lands the coach in Honor (additive; only
    // the Honor entry sets this key).
    try {
      localStorage.setItem(HONOR_POST_AUTH_KEY, ROUTES.HONOR.DASHBOARD)
    } catch {
      /* ignore storage failures */
    }
    await requestLink.mutateAsync({ email: value })
    setSent(true)
  }

  return (
    <div className="vertical-honor min-h-screen w-full" style={{ background: "#0f1830" }}>
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "#E8792B" }}>
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-white">The Honor Foundation</h1>
          <p className="mt-1 text-sm text-[#aeb8cc]">Coach Workbench</p>
          <p className="mt-0.5 text-xs text-[#7d879c]">Powered by Inspires Genius</p>
        </div>

        <div className="w-full rounded-2xl bg-white p-6 shadow-xl">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="flex justify-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(232,121,43,0.12)" }}>
                  <Mail className="h-7 w-7" style={{ color: "#c9631a" }} />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-[#18202f]">Check your email</h2>
              <p className="text-sm text-[#5b6678]">
                We sent a secure sign-in link to <span className="font-medium">{email}</span>. Click it
                to open your workbench — it expires in 15 minutes.
              </p>
              <button
                type="button"
                className="text-sm font-medium underline"
                style={{ color: "#1B2A4A" }}
                onClick={() => setSent(false)}
              >
                Use a different email
              </button>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold text-[#18202f]">Sign in</h2>
                <p className="text-sm text-[#5b6678]">
                  Enter your coach email — no password needed.
                </p>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="honor-email" className="block text-sm font-medium text-[#374151]">
                  Email
                </label>
                <input
                  id="honor-email"
                  type="email"
                  required
                  autoFocus
                  className="w-full rounded-lg border border-[#dfe4ec] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1B2A4A]"
                  placeholder="you@honor.org"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={requestLink.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60"
                style={{ background: "#1B2A4A" }}
              >
                {requestLink.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Sending link…
                  </>
                ) : (
                  <>
                    Send magic link <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-[#7d879c]">
          Members receive their own magic-link intake when a coach onboards them.
        </p>
      </div>
    </div>
  )
}
