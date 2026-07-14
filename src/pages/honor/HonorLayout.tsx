import { Navigate } from "react-router-dom"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useHonorAccess } from "@/hooks/honor/useHonorAccess"
import HonorShell from "./HonorShell"

/**
 * Entitlement gate for the Honor Foundation Coach Workbench vertical.
 *
 * Wraps every `/vertical/honor-foundation/*` page in the reskinned {@link HonorShell}
 * (navy/orange THF chrome) and redirects users who lack the "honor-foundation"
 * entitlement back to their home. Auth is already enforced by the parent
 * ProtectedRoute; this adds the vertical entitlement check on top.
 */
export default function HonorLayout() {
  const { hasAccess, isLoading } = useHonorAccess()

  if (isLoading) return <LoadingSpinner />
  if (!hasAccess) return <Navigate to="/home" replace />

  return <HonorShell />
}
