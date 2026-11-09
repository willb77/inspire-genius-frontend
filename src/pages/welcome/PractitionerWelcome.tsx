import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CheckCircle2, ClipboardList, Loader2, Link2Off } from "lucide-react"
import UserLayout from "@/layouts/UserLayout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PrismRequestApprovalNotice } from "@/components/prism/PrismRequestApprovalNotice"
import { useAuth } from "@/context/useAuth"
import { useClaimClientInvite } from "@/hooks/practitioner/useClientInvites"
import { usePrismRequestAccess } from "@/hooks/prism/usePrismRequestAccess"
import { readStoredInvite } from "@/lib/practitionerInvite"
import { HOME_ROUTE_BY_ROLE } from "@/constants/navigation"
import { ROUTES } from "@/constants/routes"
import { isUserRole } from "@/types/roles"
import type { ClaimOutcome } from "@/types/practitioner-invites"

export const NOT_VALID_MESSAGE =
  "That invitation link is not valid. Ask your practitioner to send you a new link."
export const TOO_MANY_MESSAGE =
  "Too many attempts just now. Wait a while, then open your practitioner's link again."
export const OWN_INVITE_MESSAGE =
  "This is one of your own invitation links — you cannot be your own client."
export const CLAIM_ERROR_MESSAGE =
  "We could not connect you just now. Open your practitioner's link again later, or ask them for a new one."
export const NO_INVITE_MESSAGE =
  "There is no invitation waiting in this browser tab. If your practitioner sent you a link, open it again."

const FAILURE_MESSAGE: Record<Exclude<ClaimOutcome["outcome"], "claimed">, string> = {
  not_valid: NOT_VALID_MESSAGE,
  too_many: TOO_MANY_MESSAGE,
  own_invite: OWN_INVITE_MESSAGE,
  error: CLAIM_ERROR_MESSAGE,
}

function PrismNextStep({ practitionerName }: { practitionerName: string }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const access = usePrismRequestAccess()

  if (access.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Checking your PRISM survey access…
      </p>
    )
  }

  // D7: while survey requests need prior approval, show the existing
  // approval-request step — the expected next step, not an error.
  if (access.data?.allowed === false) {
    return (
      <PrismRequestApprovalNotice
        state={access.data}
        fallbackAccount={{ name: user?.fullName || user?.name || "", email: user?.email || "" }}
      />
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        When you request your survey you can choose to share your results with {practitionerName}.
        Nothing is shared unless you tick that option.
      </p>
      <Button type="button" className="min-h-11" onClick={() => navigate(ROUTES.PRISM_ASSESSMENT)}>
        <ClipboardList className="mr-2 h-4 w-4" aria-hidden="true" />
        Take your PRISM survey
      </Button>
    </div>
  )
}

/**
 * S7 — `/welcome/practitioner`. Claims the invite token that `/signup#invite=`
 * left in sessionStorage, once, on the first authenticated load. The token is
 * cleared whatever the claim comes to (the hook does it), and the page says
 * plainly what happened. A refused link is a neutral message here — never a
 * redirect to /login.
 */
export default function PractitionerWelcome() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const claim = useClaimClientInvite()
  const started = useRef(false)
  const [hadInvite] = useState(() => readStoredInvite() !== null)
  // Held in local state rather than read off the mutation, so the outcome
  // survives a remount of the observer (React StrictMode re-runs effects).
  const [result, setResult] = useState<ClaimOutcome | null>(null)

  useEffect(() => {
    if (started.current) return
    const token = readStoredInvite()
    if (!token) return
    started.current = true
    claim
      .mutateAsync(token)
      .then(setResult)
      .catch(() => setResult({ outcome: "error" }))
    // Run once per mount: the ref above is the once-guard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const role = (user?.role ?? "").toLowerCase()
  const home = isUserRole(role) ? HOME_ROUTE_BY_ROLE[role] : ROUTES.HOME
  const waiting = hadInvite && result === null

  return (
    <UserLayout>
      <div className="mx-auto max-w-2xl space-y-6 p-4 sm:p-6">
        <h1 className="text-2xl font-semibold">Connect to your practitioner</h1>

        {!hadInvite && result === null && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm">{NO_INVITE_MESSAGE}</p>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate(home)}>
                Go to your home page
              </Button>
            </CardContent>
          </Card>
        )}

        {waiting && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Connecting you to your practitioner…
          </p>
        )}

        {result?.outcome === "claimed" && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden="true" />
                You&apos;re now connected to {result.practitionerName}.
              </CardTitle>
              <CardDescription>Next: take your PRISM survey.</CardDescription>
            </CardHeader>
            <CardContent>
              <PrismNextStep practitionerName={result.practitionerName} />
            </CardContent>
          </Card>
        )}

        {result && result.outcome !== "claimed" && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div role="alert" className="flex items-start gap-3 text-sm">
                <Link2Off className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <p>{FAILURE_MESSAGE[result.outcome]}</p>
              </div>
              <Button type="button" variant="outline" className="min-h-11" onClick={() => navigate(home)}>
                Go to your home page
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </UserLayout>
  )
}
