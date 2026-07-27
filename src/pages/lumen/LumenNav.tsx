import { NavLink, Outlet, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  LayoutDashboard,
  MessagesSquare,
  Settings,
  Sparkles,
  UserRoundSearch,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { listEntitledVerticals, useEnabledVerticals } from "@/verticals/core"

/**
 * In-vertical navigation for Lumen, plus a signposted way back out.
 *
 * Rendered from a pathless layout route (see `routes.tsx`) rather than from a
 * shared header component: the nav needs auth + entitlement context, and putting
 * it in a presentational header couples pure components to data-fetching — that
 * mistake broke every Job-Fit page test when it was tried there.
 *
 * The "switch to" list is registry-driven and entitlement-filtered, so it needs
 * no edit when a vertical is added or an entitlement changes, and it excludes
 * Lumen itself — the point of the control is leaving.
 */

const TOOLS = [
  { to: ROUTES.LUMEN.DASHBOARD, icon: LayoutDashboard, label: "Dashboard" },
  { to: ROUTES.LUMEN.SELF_PORTRAIT, icon: UserRoundSearch, label: "My Self-Portrait" },
  { to: ROUTES.LUMEN.MOMENTS, icon: Sparkles, label: "Moments" },
  { to: ROUTES.LUMEN.COACHING, icon: MessagesSquare, label: "Coaching" },
  { to: ROUTES.LUMEN.SETTINGS, icon: Settings, label: "Settings" },
]

export function LumenNav() {
  const navigate = useNavigate()
  const { data: enabled } = useEnabledVerticals()
  const others = listEntitledVerticals(enabled ?? []).filter((v) => v.key !== "lumen")

  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="Lumen" className="flex flex-wrap gap-1.5">
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

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => navigate("/home")}>
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          Back to Inspire Genius
        </Button>
        {others.length > 0 && (
          <>
            <span className="text-xs text-muted-foreground">or switch to</span>
            {others.map((v) => (
              <Button
                key={v.key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(v.homePath)}
              >
                {v.title}
              </Button>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Pathless layout route: nav above every Lumen page.
 *
 * The nav carries its own padding rather than wrapping `Outlet` in a container —
 * every Lumen page already sets its own `p-6`, and nesting them would double it.
 */
export default function LumenShell() {
  return (
    <>
      <div className="px-6 pt-6">
        <LumenNav />
      </div>
      <Outlet />
    </>
  )
}
