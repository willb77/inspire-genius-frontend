import { NavLink, useNavigate } from "react-router-dom"
import { ArrowLeft, MessagesSquare, Route as RouteIcon, ScanSearch, Target, Wand2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { Button } from "@/components/ui/button"
import { listEntitledVerticals, useEnabledVerticals } from "@/verticals/core"

/**
 * In-vertical navigation for Job Fit, plus a way back out.
 *
 * Two problems this solves. Inside the vertical there was no way to move between
 * the tools without the browser's back button. And once you were in, there was no
 * signposted exit — a vertical you can enter but not leave reads as a dead end.
 *
 * The "switch vertical" list is **registry-driven and entitlement-filtered**, so it
 * shows only what this user actually has and needs no edit when a vertical is
 * added or an entitlement changes.
 */

const TOOLS = [
  { to: ROUTES.JOB_FIT.MATCHES, icon: ScanSearch, label: "My fit" },
  { to: ROUTES.JOB_FIT.GAPS, icon: Target, label: "Gaps" },
  { to: ROUTES.JOB_FIT.PATHWAY, icon: RouteIcon, label: "Pathway" },
  { to: ROUTES.JOB_FIT.BLUEPRINT, icon: Wand2, label: "Blueprint a role" },
  { to: ROUTES.JOB_FIT.COACH, icon: MessagesSquare, label: "Coaching" },
]

export default function FitNav() {
  const navigate = useNavigate()
  const { data: enabled } = useEnabledVerticals()
  // Everything this user is entitled to, minus Job Fit itself — the point is
  // getting *out*, so listing where you already are would be noise.
  const others = listEntitledVerticals(enabled ?? []).filter((v) => v.key !== "job-fit")

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
