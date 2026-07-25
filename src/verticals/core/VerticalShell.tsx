import type { ReactNode } from "react"
import { Outlet } from "react-router-dom"
import SidebarScaffold, { type NavSectionDef } from "@/components/shared/layout/SidebarScaffold"
import { NAV_ITEMS_BY_ROLE } from "@/constants/navigation"
import { grantSidebarSectionForRole, KCE_SIDEBAR_SECTION } from "@/constants/sidebar-sections"
import { usePageViewAudit } from "@/hooks/audit/usePageViewAudit"
import { useAuth } from "@/context/useAuth"
import { isUserRole, type UserRole } from "@/types/roles"
import type { VerticalKey } from "./types"
import RequireVertical from "./RequireVertical"

type VerticalShellProps = {
  vertical: VerticalKey
  /** Where to send an unentitled user. Defaults to their home. */
  redirectTo?: string
  /**
   * Custom chrome for a themed vertical. When provided it REPLACES the default
   * shared chrome entirely, and the vertical's shell is responsible for
   * rendering its own `<Outlet/>` (e.g. Honor's `HonorShell`). When omitted, the
   * standard `SidebarScaffold` chrome wraps `<Outlet/>` — the default, used by
   * GRANT, Knowledge Continuity, and any vertical that reuses Core's chrome.
   *
   * The gate (`RequireVertical`) and the redirect are Core's either way; only
   * the chrome is pluggable. A themed vertical passes its shell here instead of
   * forking `VerticalShell`.
   */
  shell?: ReactNode
}

/**
 * The in-vertical sub-navigation section for verticals that reuse Core's chrome.
 * Returns `null` for verticals with no dedicated sidebar section (they render the
 * role menu only, matching their prior behaviour). GRANT/KCE keep their own
 * page lists so navigation between vertical pages is unchanged after the move
 * off the legacy `AppShell`/`AppSidebar`.
 */
function verticalSubNav(vertical: VerticalKey, role: UserRole): NavSectionDef | null {
  if (vertical === "grant") {
    const section = grantSidebarSectionForRole(role)
    return { label: section.label, items: section.items }
  }
  if (vertical === "knowledge-continuity") {
    return { label: KCE_SIDEBAR_SECTION.label, items: KCE_SIDEBAR_SECTION.items }
  }
  return null
}

/**
 * Default vertical chrome: the standard `SidebarScaffold` (same as every role via
 * `UnifiedLayout`) showing the user's role menu plus, when the vertical defines
 * one, its own sub-nav section. Isolated in its own component so the page-view
 * audit fires only for the shared chrome — a themed vertical passing its own
 * `shell` (e.g. Honor) keeps its existing audit behaviour untouched.
 */
function CoreVerticalChrome({ vertical, role }: { vertical: VerticalKey; role: UserRole }) {
  usePageViewAudit(vertical)
  const navItems = NAV_ITEMS_BY_ROLE[role] ?? NAV_ITEMS_BY_ROLE.user
  const subNav = verticalSubNav(vertical, role)
  const navSections: NavSectionDef[] = [
    { label: "", items: navItems },
    ...(subNav ? [subNav] : []),
  ]
  return (
    <SidebarScaffold navItems={navItems} navSections={navSections}>
      <Outlet />
    </SidebarScaffold>
  )
}

/**
 * Entitlement gate + layout for a vertical's route tree.
 *
 * Generalized from `GrantLayout`. By default wraps every `/vertical/{key}/*`
 * page in the standard `SidebarScaffold` chrome (the same chrome all roles use
 * via `UnifiedLayout`). A vertical with its own chrome passes it via `shell` —
 * the gate stays Core's, the chrome becomes the vertical's:
 *
 *     // shared chrome (GRANT):
 *     { path: "/vertical/grant", element: <VerticalShell vertical="grant" />, children: [...] }
 *
 *     // custom chrome (Honor):
 *     { path: "/vertical/honor",
 *       element: <VerticalShell vertical="honor" shell={<HonorShell/>} />,
 *       children: [...] }
 */
export default function VerticalShell({
  vertical,
  redirectTo = "/home",
  shell,
}: VerticalShellProps) {
  const { user } = useAuth()
  const rawRole = user?.role
  const role: UserRole = isUserRole(rawRole) ? rawRole : "user"

  return (
    <RequireVertical vertical={vertical} redirectTo={redirectTo}>
      {shell ?? <CoreVerticalChrome vertical={vertical} role={role} />}
    </RequireVertical>
  )
}
