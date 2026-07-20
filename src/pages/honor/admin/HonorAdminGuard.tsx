import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/useAuth"
import { useHonorAdminAccess } from "@/hooks/honor/useHonorAdmin"
import { ROUTES } from "@/constants/routes"

/**
 * Super-admin gate for the Honor Administration console. The console manages
 * platform-wide cohorts/coaches/fellows, so a non-super-admin who lands on the
 * URL directly is redirected back to the Honor dashboard. (The nav item is
 * separately hidden for non-super-admins in HonorShell.)
 *
 * Gating consults BOTH the client token role (fast path) and the authoritative
 * backend whoami — magic-link logins carry no role in the payload, so
 * `isAtLeast("super-admin")` alone would wrongly bounce a genuine super-admin.
 * We wait for whoami before redirecting, and fail closed on error.
 */
export default function HonorAdminGuard({ children }: { children: React.ReactNode }) {
  const { isAtLeast, isLoading } = useAuth()
  const { isHonorAdmin, isLoading: adminLoading } = useHonorAdminAccess()
  const tokenAdmin = typeof isAtLeast === "function" && isAtLeast("super-admin")

  if (isLoading || (!tokenAdmin && adminLoading)) return null
  if (!tokenAdmin && !isHonorAdmin) return <Navigate to={ROUTES.HONOR.DASHBOARD} replace />
  return <>{children}</>
}
