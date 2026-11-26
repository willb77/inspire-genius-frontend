import { lazy, Suspense } from "react"
import { Navigate, useSearchParams } from "react-router-dom"

import { ROUTES } from "@/constants/routes"
import { useAuth } from "@/context/useAuth"
import { usePractitionerClientRosterStatus } from "@/hooks/switches/usePractitionerClientRosterEnabled"
import { PRACTICE_OVERVIEW_PARAM } from "@/lib/practitionerFrontPage"
import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags"

const Classic = lazy(() => import("@/pages/practitioner/Home"))
const Workbench = lazy(() => import("@/pages/practitioner/WorkbenchHomePage"))

/**
 * Practitioner counterpart of {@link ManagerDashboardSwitch}. Same contract.
 *
 * RM-6 B (CSA #2236; Bill's "RM-6 B go", 2026-11-26): `/practitioner/home` is
 * where every practitioner lands (`HOME_ROUTE_BY_ROLE`, read unchanged by
 * sign-in, ProtectedRoute and onboarding). Where the Studio lists the
 * practitioner's clients (the `practitioner-client-roster` status), the Studio
 * is their front page, so this route forwards a practitioner there. Off, a 404
 * or an error: Home renders exactly as before. Never forwarded:
 *  - another role (a super-admin's "Practitioner" view-as keeps Home);
 *  - a pinned variant (`/practitioner/home/classic`);
 *  - "Practice overview" from the Studio (`?view=overview`), which is how Home
 *    is opened once it is no longer the landing.
 */
export default function PractitionerHomeSwitch({
  variant,
}: {
  variant?: "classic" | "v2"
}) {
  const { hasRole } = useAuth()
  const [params] = useSearchParams()
  const overview = params.get(PRACTICE_OVERVIEW_PARAM.key) === PRACTICE_OVERVIEW_PARAM.value
  const mayForward = hasRole("practitioner") && !variant && !overview
  const frontPage = usePractitionerClientRosterStatus(mayForward)

  // Wait for the answer rather than flash Home and then jump.
  if (mayForward && frontPage.isLoading) return null
  if (mayForward && frontPage.data === true) {
    return <Navigate to={ROUTES.PRACTITIONER.DEVELOPMENT} replace />
  }

  const useV2 = variant ? variant === "v2" : isNewUserSurfacesEnabled()
  return (
    <Suspense fallback={null}>{useV2 ? <Workbench /> : <Classic />}</Suspense>
  )
}
