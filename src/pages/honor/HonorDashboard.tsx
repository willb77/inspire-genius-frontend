import { Link } from "react-router-dom"
import {
  Users,
  UserPlus,
  Sparkles,
  Activity,
  CalendarDays,
  Settings2,
  ArrowRight,
  CheckCircle2,
  Clock,
  type LucideIcon,
} from "lucide-react"
import { ROUTES } from "@/constants/routes"
import { useAuth } from "@/context/useAuth"
import { useCoachHome } from "@/hooks/honor/useCoachData"
import { HonorCard, HonorStat, HonorSectionTitle } from "./_shared"
import VideoLibrary from "./VideoLibrary"

/**
 * Honor Coach Workbench — Dashboard ("transition-mentoring cockpit").
 *
 * Wiring target: a single JWT-scoped `GET /v1/coach/home` (net-new) returns the
 * coach's name, caseload counts, recent activity, and next events — no per-tile
 * fan-out. Mock-backed via {@link useCoachHome} for the Phase-0 scaffold.
 */

type Tile = { to: string; label: string; description: string; icon: LucideIcon }

const TILES: Tile[] = [
  { to: ROUTES.HONOR.CASELOAD, label: "My Fellows", description: "Your assigned caseload of Honor fellows.", icon: Users },
  { to: ROUTES.HONOR.ONBOARD, label: "Onboarding", description: "Add a fellow or import a cohort roster.", icon: UserPlus },
  { to: ROUTES.HONOR.EVALUATE, label: "Work with Fellows", description: "AI evaluation, goals, education & funding.", icon: Sparkles },
  { to: ROUTES.HONOR.ACTIVITY, label: "Activity", description: "Audit trail of every coach & member action.", icon: Activity },
  { to: ROUTES.HONOR.SCHEDULE, label: "Schedule", description: "Sessions, debriefs, and cohort milestones.", icon: CalendarDays },
  { to: ROUTES.HONOR.ADMINISTRATION, label: "Administration", description: "Manage coaches, teams, and cohort rosters.", icon: Settings2 },
]

export default function HonorDashboard() {
  const { data: home } = useCoachHome()
  const { user } = useAuth()
  const counts = home?.counts ?? { assigned: 0, assessed: 0, intakePending: 0 }
  const coachName = home?.coachName || user?.fullName || user?.name || "Coach"

  return (
    <div>
      {/* Hero greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#18202f]">
          Hello, {coachName}
        </h1>
        <p className="mt-1 text-[#5b6678]">
          Your transition-mentoring cockpit. Jump into your caseload, onboard a new cohort, work
          through a member evaluation, or manage your schedule and team.
        </p>
      </div>

      {/* Headline counts */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <HonorStat icon={Users} label="Assigned" value={counts.assigned} hint="fellows on your caseload" tone="navy" />
        <HonorStat icon={CheckCircle2} label="Assessed" value={counts.assessed} hint="behavioral profile complete" tone="green" />
        <HonorStat icon={Clock} label="Intake pending" value={counts.intakePending} hint="awaiting PRISM intake" tone="orange" />
      </div>

      {/* Videos */}
      <HonorSectionTitle>Videos</HonorSectionTitle>
      <HonorCard className="mb-6">
        <p className="mb-3 text-sm text-[#5b6678]">
          Short overviews of PRISM Brain Mapping and the program. Pick a title to play it.
        </p>
        <VideoLibrary />
      </HonorCard>

      {/* Nav tiles */}
      <HonorSectionTitle>Jump in</HonorSectionTitle>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link key={tile.to} to={tile.to} className="group">
            <HonorCard className="h-full transition-colors group-hover:border-[#E8792B]">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(27,42,74,0.10)" }}>
                  <tile.icon className="h-5 w-5 text-[#1B2A4A]" />
                </div>
                <h3 className="text-base font-semibold text-[#18202f]">{tile.label}</h3>
              </div>
              <p className="text-sm text-[#5b6678]">{tile.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-[#E8792B]">
                Open <ArrowRight className="h-4 w-4" />
              </span>
            </HonorCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
