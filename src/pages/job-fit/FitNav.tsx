import { NavLink } from "react-router-dom"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"
import { jobFitToolsForRole } from "@/constants/vertical-subnav"
import { useAuth } from "@/context/useAuth"
import { isUserRole, type UserRole } from "@/types/roles"

/**
 * In-vertical navigation for Job Fit — the tool pills.
 *
 * The cross-vertical row that used to sit under the pills ("Back to Inspire
 * Genius" plus an "or switch to <vertical>" list) was removed per request. The
 * left sidebar and the brand logo (→ Home v2) remain the way out of the vertical.
 */

// The same list the sidebar renders inside Job Fit — see
// `@/constants/vertical-subnav`. Shared rather than duplicated so the pill row
// and the left-rail menu can never disagree about what Job Fit contains — or
// about which entries are greyed for this role.

export default function FitNav() {
  const { user } = useAuth()
  // Same resolution as `VerticalShell`, which feeds the sidebar: an unknown or
  // missing role is treated as `user`, so the two surfaces always agree.
  const rawRole = user?.role
  const role: UserRole = isUserRole(rawRole) ? rawRole : "user"
  const tools = jobFitToolsForRole(role)

  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="Job Fit tools" className="flex flex-wrap gap-1.5">
        {tools.map(({ to, icon: Icon, label, disabled, disabledReason }) =>
          disabled ? (
            // Greyed: listed so the tool stays discoverable, but no href, not in
            // the tab order, and announced as disabled — mirroring the
            // sidebar's locked item.
            <span
              key={to}
              role="link"
              aria-disabled="true"
              title={disabledReason ?? `${label} — not available`}
              className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[#e5e7eb] bg-[#f9fafb] px-3 py-1.5 text-sm text-[#6b7280]/50"
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
              <Lock className="h-3.5 w-3.5 opacity-60" aria-hidden />
            </span>
          ) : (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-[#0D9488] bg-[rgba(13,148,136,0.1)] font-medium text-[#0f766e]"
                    : "border-[#e5e7eb] bg-white text-[#6b7280] hover:border-[#0D9488]/50"
                )
              }
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </NavLink>
          )
        )}
      </nav>
    </div>
  )
}
