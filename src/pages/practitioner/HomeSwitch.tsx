import { lazy, Suspense } from "react"

import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags"

const Classic = lazy(() => import("@/pages/practitioner/Home"))
const Workbench = lazy(() => import("@/pages/practitioner/WorkbenchHomePage"))

/** Practitioner counterpart of {@link ManagerDashboardSwitch}. Same contract. */
export default function PractitionerHomeSwitch({
  variant,
}: {
  variant?: "classic" | "v2"
}) {
  const useV2 = variant ? variant === "v2" : isNewUserSurfacesEnabled()
  return (
    <Suspense fallback={null}>{useV2 ? <Workbench /> : <Classic />}</Suspense>
  )
}
