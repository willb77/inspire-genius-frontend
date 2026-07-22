import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import DashboardFrame from "@/components/dashboard/DashboardFrame"
import StatCard from "@/components/dashboard/StatCard"
import QuickActions from "@/components/dashboard/QuickActions"
import DataCard from "@/components/dashboard/DataCard"
import { Button } from "@/components/ui/button"
import type { StatCardData } from "@/types/dashboard/data-types"
import {
  Users,
  UserPlus,
  UserCheck,
  CalendarDays,
  Wallet,
  Video,
  Sparkles,
  Brain,
} from "lucide-react"

/**
 * Practitioner Home (Phase 2 wireframe).
 *
 * Reuses the My Workspace tile theme verbatim (DashboardFrame + WelcomeBanner +
 * QuickActions + StatCard + DataCard):
 *   - Tile one   — "Welcome back, {name}" + today's date (the gradient banner)
 *   - Tile two   — "Chat with Meridian" card → the practitioner Meridian chat
 *   - Tile three — Quick Actions (Client · Schedule · Credits · Add a Client · Meeting)
 *
 * Metrics are stubbed (wireframe); real data is wired in a later phase.
 */
export default function PractitionerHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there"
  const today = format(new Date(), "EEEE, MMMM d, yyyy")

  // Tile 3 — Quick Actions
  const QUICK_ACTIONS = [
    {
      label: "Chat with Meridian",
      icon: Sparkles,
      to: ROUTES.PRACTITIONER.MERIDIAN_CHAT,
      bg: "bg-blue-100",
      iconColor: "text-blue-600",
      state: { autoLoadPrism: true },
    },
    { label: "Client", icon: Users, to: ROUTES.PRACTITIONER.CLIENTS, bg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: "Schedule", icon: CalendarDays, to: ROUTES.PRACTITIONER.SCHEDULE, bg: "bg-violet-100", iconColor: "text-violet-600" },
    { label: "Credits", icon: Wallet, to: ROUTES.PRACTITIONER.CREDITS, bg: "bg-amber-100", iconColor: "text-amber-600" },
    { label: "Add a Client", icon: UserPlus, to: ROUTES.PRACTITIONER.CLIENTS, bg: "bg-rose-100", iconColor: "text-rose-600" },
    { label: "Meeting", icon: Video, to: ROUTES.PRACTITIONER.MEETING, bg: "bg-teal-100", iconColor: "text-teal-600" },
  ]

  const STATS: StatCardData[] = [
    { label: "Active Clients", value: "—", change: "wireframe", icon: UserCheck, iconColor: "text-blue-600", iconBg: "bg-blue-100" },
    { label: "Sessions This Week", value: "—", change: "wireframe", icon: CalendarDays, iconColor: "text-emerald-600", iconBg: "bg-emerald-100" },
    { label: "PRISM Reports", value: "—", change: "wireframe", icon: Brain, iconColor: "text-violet-600", iconBg: "bg-violet-100" },
    { label: "Credit Balance", value: "—", change: "wireframe", icon: Wallet, iconColor: "text-amber-600", iconBg: "bg-amber-100" },
  ]

  const kpisAndActions = (
    <div className="space-y-5">
      <QuickActions actions={QUICK_ACTIONS} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>
    </div>
  )

  // Tile 2 — Chat with Meridian
  const primary = (
    <DataCard title="Chat with Meridian">
      <div className="flex flex-col items-start gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827]">Your AI coaching partner</p>
            <p className="text-sm text-muted-foreground">
              Ask Meridian about a client, a PRISM profile, or plan your day.
            </p>
          </div>
        </div>
        <Button
          onClick={() =>
            navigate(ROUTES.PRACTITIONER.MERIDIAN_CHAT, { state: { autoLoadPrism: true } })
          }
        >
          Open Meridian chat
        </Button>
      </div>
    </DataCard>
  )

  return (
    <PractitionerLayout>
      <DashboardFrame
        title={`Welcome back, ${firstName}`}
        subtitle={today}
        kpis={kpisAndActions}
        primary={primary}
      />
    </PractitionerLayout>
  )
}
