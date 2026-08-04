import { NavLink, Outlet } from "react-router-dom"
import { cn } from "@/lib/utils"
import { DIRECTION_SETTING_TOOLS } from "@/constants/vertical-subnav"

/**
 * In-vertical navigation for Direction Setting.
 *
 * Rendered from a pathless layout route (see `routes.tsx`) rather than from a
 * shared header component: the nav needs auth + entitlement context, and putting
 * it in a presentational header couples pure components to data-fetching — that
 * mistake broke every Job-Fit page test when it was tried there.
 *
 * 2026-08-04 — the "Back to Inspire Genius / or switch to …" vertical-switcher
 * row was removed at the user's request; the pages below now sit higher on the
 * screen. Leaving a vertical is done from the left sidebar (My Workspace + the
 * Tools rollup), so the on-page switcher was redundant with it.
 */

// The same list the sidebar renders inside the vertical — see
// `@/constants/vertical-subnav`. Shared rather than duplicated so the pill row
// and the left-rail menu can never disagree about what this vertical contains.
const TOOLS = DIRECTION_SETTING_TOOLS

export function DirectionSettingNav() {
  return (
    <nav
      aria-label="Direction Setting"
      className="mb-6 flex flex-wrap gap-1.5"
    >
      {TOOLS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end
          className={({ isActive }) =>
            cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              isActive
                ? "border-primary bg-primary/10 font-medium text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/50"
            )
          }
        >
          <Icon className="h-4 w-4" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}

/**
 * Pathless layout route: nav above every Direction Setting page.
 *
 * The nav carries its own padding rather than wrapping `Outlet` in a container —
 * every page below already sets its own `p-6`, and nesting them would double it.
 */
export default function DirectionSettingShell() {
  return (
    <>
      <div className="px-6 pt-6">
        <DirectionSettingNav />
      </div>
      <Outlet />
    </>
  )
}
