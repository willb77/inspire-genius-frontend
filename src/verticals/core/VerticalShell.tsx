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
}

/**
 * Entitlement gate + layout for a vertical's route tree.
 *
 * Generalized from `GrantLayout`. Wraps every `/vertical/{key}/*` page in the
 * EXISTING AppShell (shared sidebar, light theme) — per the simplified vertical
 * model, verticals reuse Core's shell rather than bringing their own. A vertical
 * that needs different chrome should wrap this rather than fork it.
 *
 * Use as a route element with child routes rendered through `<Outlet />`:
 *
 *     { path: "/vertical/acme", element: <VerticalShell vertical="acme" />,
 *       children: [ ... ] }
 */
export default function VerticalShell({
  vertical,
  redirectTo = "/home",
}: VerticalShellProps) {
  const { user } = useAuth()
  const rawRole = user?.role
  const role: UserRole = isUserRole(rawRole) ? rawRole : "user"

  return (
    <RequireVertical vertical={vertical} redirectTo={redirectTo}>
      <AppShell role={role}>
        <Outlet />
      </AppShell>
    </RequireVertical>
  )
}
