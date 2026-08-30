import type { ReactNode } from "react"
import { Outlet } from "react-router-dom"
import SidebarScaffold from "@/components/shared/layout/SidebarScaffold"
import { useVerticalPageSections } from "@/hooks/nav/useVerticalPageSections"
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
 * Default vertical chrome: the standard `SidebarScaffold`, showing the full app
 * menu with **only the vertical you just entered expanded** — My Workspace,
 * Role Views, Verticals and Administration are all present but rolled up. See
 * {@link useVerticalPageSections} for the ordering and why.
 *
 * Isolated in its own component so the page-view audit fires only for the
 * shared chrome — a themed vertical passing its own `shell` (e.g. Honor) keeps
 * its existing audit behaviour untouched.
 */
function CoreVerticalChrome({ vertical, role }: { vertical: VerticalKey; role: UserRole }) {
  usePageViewAudit(vertical)
  const navSections = useVerticalPageSections(vertical, role)
  return (
    <SidebarScaffold navItems={[]} navSections={navSections}>
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
