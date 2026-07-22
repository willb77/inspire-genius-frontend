import { useNavigate } from "react-router-dom"
import { format } from "date-fns"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import DashboardFrame from "@/components/dashboard/DashboardFrame"
import QuickActions from "@/components/dashboard/QuickActions"
import DataCard from "@/components/dashboard/DataCard"
import { Button } from "@/components/ui/button"
import { Users, UserPlus, CalendarDays, Wallet, Video, Sparkles } from "lucide-react"

/**
 * Practitioner Home — the My Workspace tile theme, exactly three tiles:
 *   - Tile one   — "Welcome back, {name}" + today's date (the gradient banner)
 *   - Tile two   — "Chat with Meridian" card → the practitioner Meridian chat
 *   - Tile three — Quick Actions: Client · Schedule · Credits · Add a Client · Meeting
 */
export default function PractitionerHome() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? "there"
  const today = format(new Date(), "EEEE, MMMM d, yyyy")

  // Tile three — Quick Actions (exactly the five requested)
  const QUICK_ACTIONS = [
    { label: "Client", icon: Users, to: ROUTES.PRACTITIONER.CLIENTS, bg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: "Schedule", icon: CalendarDays, to: ROUTES.PRACTITIONER.SCHEDULE, bg: "bg-violet-100", iconColor: "text-violet-600" },
    { label: "Credits", icon: Wallet, to: ROUTES.PRACTITIONER.ANALYTICS, bg: "bg-amber-100", iconColor: "text-amber-600" },
    { label: "Add a Client", icon: UserPlus, to: ROUTES.PRACTITIONER.CLIENTS, bg: "bg-rose-100", iconColor: "text-rose-600" },
    { label: "Meeting", icon: Video, to: ROUTES.PRACTITIONER.MEETING, bg: "bg-teal-100", iconColor: "text-teal-600" },
  ]

  // Tile two — Chat with Meridian
  const chatTile = (
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
        kpis={chatTile}
        primary={<QuickActions actions={QUICK_ACTIONS} />}
      />
    </PractitionerLayout>
  )
}
