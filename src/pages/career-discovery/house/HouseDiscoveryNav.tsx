import { NavLink, useLocation } from "react-router-dom"
import { CalendarRange } from "lucide-react"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { CAREER_DISCOVERY_TOOLS } from "@/constants/vertical-subnav"
import type { NavItemDef } from "@/components/shared/layout/SidebarScaffold"
import { useDiscoveryJourney, useDiscoveryStatus } from "@/hooks/career-discovery/useCareerDiscovery"
import { costSearch, recallCost } from "./lastCost"
import { discoveryMenu, isProfileMerged } from "@/lib/career-discovery/profileSection"

const DEGREE_PLAN: NavItemDef = {
  to: ROUTES.CAREER_DISCOVERY.DEGREE_PLAN,
  icon: CalendarRange,
  label: "Degree plan",
}

/**
 * House style (career-education): the studio's own page menu.
 *
 * Same entries as today, plus two fixes from the usability review:
 * - "Degree plan" gets an entry, after Education paths, whenever the server
 *   has Education paths switched on (the same test the plan page itself uses).
 *   Before, it could only be found after choosing a program.
 * - "Cost and payback" opens the last school and path looked at in this tab,
 *   instead of always landing on "Pick a school first".
 *
 * The journey and status reads are the shell's own queries (same keys), so this
 * makes no extra server call. The sidebar menu is not changed here.
 */
export function HouseDiscoveryNav() {
  useLocation() // re-render on every move, so a just-opened cost is picked up
  const status = useDiscoveryStatus()
  const journey = useDiscoveryJourney(status.data?.enabled === true)
  const educationOn =
    journey.data?.stages.some((s) => s.id === "education" && s.available) === true
  const lastCost = recallCost()

  const items: NavItemDef[] = []
  // JF-11: one "My profile" entry when the server folds Who I am into About me.
  for (const item of discoveryMenu(CAREER_DISCOVERY_TOOLS, isProfileMerged(journey.data?.stages))) {
    if (item.to === ROUTES.CAREER_DISCOVERY.COST && lastCost) {
      items.push({ ...item, to: item.to + costSearch(lastCost) })
    } else {
      items.push(item)
    }
    if (item.to === ROUTES.CAREER_DISCOVERY.EDUCATION && educationOn) items.push(DEGREE_PLAN)
  }

  return (
    <nav aria-label="Career & Education Discovery" className="mb-6 flex flex-wrap gap-1.5">
      {items.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={label}
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
