import { Navigate, Outlet } from "react-router-dom"
import AppShell from "@/layouts/AppShell"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useAuth } from "@/context/useAuth"
import { useVerticalAccess } from "@/hooks/grant/useVerticalAccess"
import { isUserRole, type UserRole } from "@/types/roles"

/**
 * Entitlement gate + shell for the GRANT vertical.
 *
 * Wraps every `/vertical/grant/*` page in the EXISTING AppShell (light theme,
 * shared sidebar) and redirects users who lack the "grant" entitlement back to
 * their home. Auth is already enforced by the parent ProtectedRoute.
 */
export default function GrantLayout() {
  const { user } = useAuth()
  const { hasAccess, isLoading } = useVerticalAccess("grant")

  const rawRole = user?.role
  const role: UserRole = isUserRole(rawRole) ? rawRole : "user"

  if (isLoading) return <LoadingSpinner />
  if (!hasAccess) return <Navigate to="/home" replace />

  return (
    <AppShell role={role}>
      <Outlet />
    </AppShell>
  )
}
