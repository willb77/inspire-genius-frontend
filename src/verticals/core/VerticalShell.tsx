import type { ReactNode } from "react"
import { Outlet } from "react-router-dom"
import AppShell from "@/layouts/AppShell"
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
   * `AppShell` entirely, and the vertical's shell is responsible for rendering
   * its own `<Outlet/>` (e.g. Honor's `HonorShell`). When omitted, the shared
   * `AppShell` wraps `<Outlet/>` — the default, used by GRANT and any vertical
   * that reuses Core's chrome.
   *
   * The gate (`RequireVertical`) and the redirect are Core's either way; only
   * the chrome is pluggable. A themed vertical passes its shell here instead of
   * forking `VerticalShell`.
   */
  shell?: ReactNode
}

/**
 * Entitlement gate + layout for a vertical's route tree.
 *
 * Generalized from `GrantLayout`. By default wraps every `/vertical/{key}/*`
 * page in the shared `AppShell` (sidebar, light theme). A vertical with its own
 * chrome passes it via `shell` — the gate stays Core's, the chrome becomes the
 * vertical's:
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
      {shell ?? (
        <AppShell role={role}>
          <Outlet />
        </AppShell>
      )}
    </RequireVertical>
  )
}
