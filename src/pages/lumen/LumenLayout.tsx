import SidebarScaffold from "@/components/shared/layout/SidebarScaffold"
import LoadingSpinner from "@/components/LoadingSpinner"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import { useAuth } from "@/context/useAuth"
import { isUserRole, type UserRole } from "@/types/roles"
import { VerticalShell, useVerticalAccess } from "@/verticals/core"
import LumenRequestAccess from "./LumenRequestAccess"

/**
 * Entitlement gate + shell for the Lumen vertical.
 *
 * The entitled path delegates entirely to Core's `VerticalShell` — it owns the
 * chrome, the role nav, and the page-view audit, and re-checks entitlement
 * itself. Nothing about Lumen's chrome is forked. (This deliberately does NOT
 * hand-roll the shared chrome: Core moved verticals off the legacy `AppShell`
 * onto `SidebarScaffold`, and a copy here would have to be re-fixed every time
 * Core's chrome moves again.)
 *
 * The one deliberate difference is the **unentitled** path. Core's
 * `RequireVertical` navigates to `/home`, which is right for a B2B vertical
 * reached from an in-app launcher — but Lumen is B2C, and a consumer who
 * followed a link to Lumen and landed silently on `/home` would reasonably
 * conclude the product doesn't exist. Build plan §7.3 asks for a "not enabled
 * yet / request access" state, and never a paywall.
 *
 * So this component branches before `VerticalShell` renders: unentitled users
 * get `LumenRequestAccess` inside the standard chrome — with their role nav, so
 * they have a way out — and entitled users get Core's shell untouched. Per the
 * vertical rules the patch lives here, not in Core. `useVerticalAccess` remains
 * the single source of entitlement truth, so the `lumen_dev_access` preview
 * override works exactly as it does for every other vertical.
 */
export default function LumenLayout() {
  const { user } = useAuth()
  const role: UserRole = isUserRole(user?.role) ? (user?.role as UserRole) : "user"
  const { hasAccess, isLoading } = useVerticalAccess("lumen")

  // Waiting matters: rendering "not enabled" before entitlement resolves would
  // tell entitled users they have no access, on every single load.
  if (isLoading) return <LoadingSpinner />

  if (!hasAccess) {
    const navItems = NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
    return (
      <SidebarScaffold navItems={navItems}>
        <LumenRequestAccess />
      </SidebarScaffold>
    )
  }

  return <VerticalShell vertical="lumen" />
}
