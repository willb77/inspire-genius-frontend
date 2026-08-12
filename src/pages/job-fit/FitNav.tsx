import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { JOB_FIT_TOOLS } from "@/constants/vertical-subnav"

/**
 * In-vertical navigation for Job Fit — the tool pills.
 *
 * The cross-vertical row that used to sit under the pills ("Back to Inspire
 * Genius" plus an "or switch to <vertical>" list) was removed per request. The
 * left sidebar and the brand logo (→ Home v2) remain the way out of the vertical.
 */

// The same list the sidebar renders inside Job Fit — see
// `@/constants/vertical-subnav`. Shared rather than duplicated so the pill row
// and the left-rail menu can never disagree about what Job Fit contains.
const TOOLS = JOB_FIT_TOOLS

export default function FitNav() {
  return (
    <div className="mb-6 space-y-3">
      <nav aria-label="Job Fit tools" className="flex flex-wrap gap-1.5">
        {TOOLS.map(({ to, icon: Icon, label }) => (
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
        ))}
      </nav>
    </div>
  )
}
