import { Navigate } from "react-router-dom"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"

/**
 * Super-admin gate for the Honor Administration console. The console manages
 * platform-wide cohorts/coaches/fellows, so a non-super-admin who lands on the
 * URL directly is redirected back to the Honor dashboard. (The nav item is
 * separately hidden for non-super-admins in HonorShell.)
 */
export default function HonorAdminGuard({ children }: { children: React.ReactNode }) {
  const { isAtLeast, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAtLeast("super-admin")) return <Navigate to={ROUTES.HONOR.DASHBOARD} replace />
  return <>{children}</>
}
