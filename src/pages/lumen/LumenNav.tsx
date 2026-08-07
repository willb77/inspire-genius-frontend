import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { LUMEN_TOOLS } from "@/constants/vertical-subnav"

/**
 * In-vertical navigation for Lumen, plus a signposted way back out.
 *
 * Rendered from a pathless layout route (see `routes.tsx`) rather than from a
 * shared header component: the nav needs auth + entitlement context, and putting
 * it in a presentational header couples pure components to data-fetching — that
 * mistake broke every Job-Fit page test when it was tried there.
 *
 * 2026-08-06 (request): collapsed to ONE row. The second row held "Back to
 * Inspire Genius" plus an "or switch to …" list of every other entitled
 * vertical — a registry-driven cross-vertical switcher. Both the switcher and
 * the row are gone; "Back to Inspire Genius" moved up beside the Lumen tools,
 * where the one navigation people actually use out of here now lives.
 *
 * Nothing became unreachable: the other verticals are in the left sidebar's
 * Tools section on every page, which is where a catalogue belongs — the switcher
 * duplicated it inside Lumen only.
 */

// The same list the sidebar renders inside Lumen — see
// `@/constants/vertical-subnav`. Shared rather than duplicated so the pill row
// and the left-rail menu can never disagree about what Lumen contains.
const TOOLS = LUMEN_TOOLS

export function LumenNav() {
  const navigate = useNavigate()

  return (
    <div className="mb-6">
      <nav aria-label="Lumen" className="flex flex-wrap items-center gap-1.5">
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

        {/* Pushed to the end of the same row rather than given a row of its own.
            It is the one control here that LEAVES Lumen, so it is deliberately
            separated by the margin instead of sitting flush against the tools. */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => navigate("/home")}
          data-testid="lumen-back-to-ig"
          className="ms-auto"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden />
          Back to Inspire Genius
        </Button>
      </nav>
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
