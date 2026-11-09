import { useEffect } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import { readStoredInvite } from "@/lib/practitionerInvite"

/**
 * PI-4 — "first authenticated load". Once a session exists and an invite token
 * from `/signup#invite=` is waiting in sessionStorage, send the user to S7,
 * which claims it. Renders nothing.
 *
 * With no stored token (everyone who did not open an invite link) it does
 * nothing at all. It never reads or sends the token itself.
 */
export function PendingInviteRedirect() {
  const { user, pendingRoleSelection } = useAuth()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const signedIn = Boolean(user?.token)

  useEffect(() => {
    if (!signedIn || pendingRoleSelection) return
    if (pathname === ROUTES.WELCOME_PRACTITIONER) return
    if (readStoredInvite() === null) return
    navigate(ROUTES.WELCOME_PRACTITIONER, { replace: true })
  }, [signedIn, pendingRoleSelection, pathname, navigate])

  return null
}
