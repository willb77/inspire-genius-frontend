import { Link, NavLink, Outlet, useLocation } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/constants/routes"
import { CAREER_DISCOVERY_TOOLS } from "@/constants/vertical-subnav"
import {
  discoveryErrorMessage,
  useDiscoveryJourney,
  useDiscoveryStatus,
} from "@/hooks/career-discovery/useCareerDiscovery"
import { DiscoveryError, DiscoveryLoading, NoticeCard } from "./DiscoveryParts"
import type { DiscoveryContext } from "./discoveryContext"

/**
 * Career & Education Discovery's pathless layout: the in-vertical nav, then
 * three gates before any stage renders.
 *
 * 1. The server switch — off, every page says so plainly (no stage call made).
 * 2. The journey loads — a 503 ("not set up on this tier") or any other failure
 *    is rendered as an alert, never a blank page.
 * 3. The age floor — under 13, every page explains that Discovery is for 13 and
 *    over; with no age range yet, every page but the journey sends the person
 *    to the first step, where it is asked.
 *
 * These mirror the server's gates; they are presentation, not security.
 */
export function DiscoveryNav() {
  return (
    <nav aria-label="Career & Education Discovery" className="mb-6 flex flex-wrap gap-1.5">
      {CAREER_DISCOVERY_TOOLS.map(({ to, icon: Icon, label }) => (
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

function Gate() {
  const { pathname } = useLocation()
  const status = useDiscoveryStatus()
  const enabled = status.data?.enabled === true
  const journey = useDiscoveryJourney(enabled)

  if (status.isLoading) return <DiscoveryLoading label="Checking Discovery" />
  if (status.isError) return <DiscoveryError message={discoveryErrorMessage(status.error)} />
  if (!enabled) {
    return (
      <NoticeCard title="Not switched on yet">
        <p>Career &amp; Education Discovery isn&apos;t switched on yet. Nothing is wrong with your account.</p>
      </NoticeCard>
    )
  }
  if (journey.isLoading) return <DiscoveryLoading label="Loading your journey" />
  if (journey.isError || !journey.data) {
    return <DiscoveryError message={discoveryErrorMessage(journey.error)} />
  }

  const j = journey.data
  if (j.ageBand === "under_13") {
    return (
      <NoticeCard title="Discovery is for ages 13 and over">
        <p>
          Discovery is for people aged {j.ageFloor} and over, so it can&apos;t collect or show anything
          for you yet. Nothing about you has been kept here except that answer.
        </p>
      </NoticeCard>
    )
  }
  const onJourney = pathname === ROUTES.CAREER_DISCOVERY.JOURNEY
  if (!j.mayProceed && !onJourney) {
    return (
      <NoticeCard title="Start on the first step">
        <p>Discovery needs your age range before anything else.</p>
        <Button asChild size="sm">
          <Link to={ROUTES.CAREER_DISCOVERY.JOURNEY}>Go to the first step</Link>
        </Button>
      </NoticeCard>
    )
  }
  const context: DiscoveryContext = { journey: j }
  return <Outlet context={context} />
}

export default function DiscoveryShell() {
  return (
    <div className="p-6">
      <DiscoveryNav />
      <Gate />
    </div>
  )
}
