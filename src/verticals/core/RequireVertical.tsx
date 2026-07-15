import { Navigate } from "react-router-dom"
import LoadingSpinner from "@/components/LoadingSpinner"
import type { VerticalKey } from "./types"
import { useVerticalAccess } from "./useVerticalAccess"

type RequireVerticalProps = {
  vertical: VerticalKey
  children: React.ReactNode
  /** Where to send an unentitled user. Defaults to their home. */
  redirectTo?: string
}

/**
 * Entitlement guard for a vertical's routes.
 *
 * Renders `children` only for users entitled to `vertical`; everyone else is
 * redirected. Auth itself is enforced upstream by `ProtectedRoute` — this guards
 * entitlement, not identity.
 *
 * Gates *visibility* only. The API authorizes every request independently; a
 * vertical whose backend trusts this component has no security boundary.
 */
export default function RequireVertical({
  vertical,
  children,
  redirectTo = "/home",
}: RequireVerticalProps) {
  const { hasAccess, isLoading } = useVerticalAccess(vertical)

  if (isLoading) return <LoadingSpinner />
  if (!hasAccess) return <Navigate to={redirectTo} replace />
  return <>{children}</>
}
