import { lazy, Suspense } from "react"

import { isNewUserSurfacesEnabled } from "@/lib/surfaceFlags"

const Classic = lazy(() => import("@/pages/manager/Dashboard"))
const Workbench = lazy(() => import("@/pages/manager/WorkbenchDashboard"))

/**
 * Picks the manager dashboard by surface flag, exactly as
 * `/manager/development` already does.
 *
 * `variant` forces one, which is what `/manager/dashboard/classic` uses. Keeping
 * the classic page routable is not politeness: this surface is in daily use at a
 * named customer, and a reskin that cannot be stepped around is a reskin that
 * has to be reverted the first time somebody is mid-task.
 */
export default function ManagerDashboardSwitch({
  variant,
}: {
  variant?: "classic" | "v2"
}) {
  const useV2 = variant ? variant === "v2" : isNewUserSurfacesEnabled()
  return (
    <Suspense fallback={null}>{useV2 ? <Workbench /> : <Classic />}</Suspense>
  )
}
