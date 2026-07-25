import { Outlet } from "react-router-dom"
import AppShell from "@/layouts/AppShell"
import LoadingSpinner from "@/components/LoadingSpinner"
import { useAuth } from "@/context/useAuth"
import { isUserRole, type UserRole } from "@/types/roles"
import { useVerticalAccess } from "@/verticals/core"
import LumenRequestAccess from "./LumenRequestAccess"

/**
 * Entitlement gate + shell for the Lumen vertical.
 *
 * Mirrors Core's `VerticalShell` default branch (the shared `AppShell`, no forked
 * chrome) with one deliberate difference: an unentitled user gets a
 * **request-access state instead of a redirect to `/home`**.
 *
 * Why not just use `VerticalShell`? Its `RequireVertical` navigates away, which is
 * right for a B2B vertical reached from an in-app launcher — but Lumen is B2C, and
 * a consumer who followed a link to Lumen and landed silently on `/home` would
 * reasonably conclude the product doesn't exist. Build plan §7.3 calls for a
 * "not enabled yet / request access" state, and never a paywall.
 *
 * Per the vertical rules, that patch lives here in the vertical layer — Core's
 * gate is untouched. `useVerticalAccess` is still the single source of truth for
 * entitlement, so the `lumen_dev_access` preview override works for demos exactly
 * as it does for every other vertical.
 */
export default function LumenLayout() {
  const { user } = useAuth()
  const role: UserRole = isUserRole(user?.role) ? (user?.role as UserRole) : "user"
  const { hasAccess, isLoading } = useVerticalAccess("lumen")

  if (isLoading) return <LoadingSpinner />

  return (
    <AppShell role={role}>
      {hasAccess ? <Outlet /> : <LumenRequestAccess />}
    </AppShell>
  )
}
