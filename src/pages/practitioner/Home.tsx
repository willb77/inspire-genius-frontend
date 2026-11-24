import { useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import PractitionerLayout from "@/layouts/PractitionerLayout"
import { useAuth } from "@/context/useAuth"
import { ROUTES } from "@/constants/routes"
import WelcomeBanner from "@/components/dashboard/WelcomeBanner"
import QuickActions from "@/components/dashboard/QuickActions"
import StatCard from "@/components/dashboard/StatCard"
import DataCard from "@/components/dashboard/DataCard"
import { Skeleton } from "@/components/ui/skeleton"
import { useCoachClients, useCoachCredits } from "@/hooks/practitioner/useCoachClient"
import type { StatCardData } from "@/types/dashboard/data-types"
import {
  Users,
  UserPlus,
  UserCheck,
  CalendarDays,
  Wallet,
  Video,
  Brain,
  ChevronRight,
} from "lucide-react"
import { withPrism } from "@/lib/withPrism"

/**
 * Practitioner Home — same format as the standard My Workspace Home (HomeV2):
 * a cream `#FBF7F0` rounded surface with a centered, single-column `max-w-6xl`
 * stack. Tiles: welcome banner, quick-action tiles, status tiles, and a
 * 2-column list of clients (each row links to the client profile).
 */
export default function PractitionerHome() {
  const { t } = useTranslation("practitionerPages")
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName =
    user?.fullName?.split(" ")[0] ?? user?.name?.split(" ")[0] ?? t("home.fallbackName", { defaultValue: "there" })
  const today = format(new Date(), "EEEE, MMMM d, yyyy")

  const { data: clients, isLoading: clientsLoading } = useCoachClients()
  const { data: credits } = useCoachCredits()
  const roster = clients ?? []

  const QUICK_ACTIONS = [
    { label: t("home.quick.client", { defaultValue: "Client" }), icon: Users, to: ROUTES.PRACTITIONER.CLIENTS, bg: "bg-emerald-100", iconColor: "text-emerald-600" },
    { label: t("home.quick.schedule", { defaultValue: "Schedule" }), icon: CalendarDays, to: ROUTES.PRACTITIONER.SCHEDULE, bg: "bg-violet-100", iconColor: "text-violet-600" },
    { label: t("home.quick.analytics", { defaultValue: "Analytics" }), icon: Wallet, to: ROUTES.PRACTITIONER.ANALYTICS, bg: "bg-amber-100", iconColor: "text-amber-600" },
    { label: t("home.quick.addClient", { defaultValue: "Add a Client" }), icon: UserPlus, to: ROUTES.PRACTITIONER.CLIENTS, bg: "bg-rose-100", iconColor: "text-rose-600" },
    { label: t("home.quick.meeting", { defaultValue: "Meeting" }), icon: Video, to: ROUTES.PRACTITIONER.MEETING, bg: "bg-teal-100", iconColor: "text-teal-600" },
  ]

  const activeClients = roster.filter((c) => c.status === "active").length
  const prismReady = roster.filter((c) => c.prismStatus === "ready").length

  const STATS: StatCardData[] = [
    { label: t("home.stat.activeClients", { defaultValue: "Active Clients" }), value: activeClients, icon: UserCheck, iconColor: "text-blue-600", iconBg: "bg-blue-100" },
    { label: t("home.stat.totalClients", { defaultValue: "Total Clients" }), value: roster.length, icon: Users, iconColor: "text-emerald-600", iconBg: "bg-emerald-100" },
    { label: t("home.stat.prismReports", { defaultValue: "PRISM Reports" }), value: prismReady, icon: Brain, iconColor: "text-violet-600", iconBg: "bg-violet-100" },
    { label: t("home.stat.underManagement", { defaultValue: "Clients Under Management" }), value: credits?.clientsUnderManagement ?? "—", icon: Users, iconColor: "text-amber-600", iconBg: "bg-amber-100" },
  ]

  const prismBadge = (c: (typeof roster)[number]) => {
    if (c.prismStatus === "ready" && c.prismScore !== null) {
      return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#D1FAE5] text-[#065F46]">{withPrism(t("home.prismScore", { score: c.prismScore, defaultValue: "PRISM {{score}}" }))}</span>
    }
    if (c.prismStatus === "in_progress") {
      return <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[#FEF3C7] text-[#92400E]">{t("home.inProgress", { defaultValue: "In progress" })}</span>
    }
    return <span className="text-[11px] font-medium px-2 py-0.5 rounded-lg bg-[#F3F4F6] text-[#6B7280]">{withPrism(t("home.noPrism", { defaultValue: "No PRISM" }))}</span>
  }

  return (
    <PractitionerLayout>
      {/* Standard-site format (HomeV2): cream surface + centered single column. */}
      <div className="rounded-2xl bg-[#FBF7F0] p-4 md:p-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-4">
          {/* Welcome */}
          <WelcomeBanner title={t("home.welcomeBack", { name: firstName, defaultValue: "Welcome back, {{name}}" })} subtitle={today} />

          {/* Quick-action tiles */}
          <QuickActions actions={QUICK_ACTIONS} />

          {/* Status tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          {/* 2-column client list */}
          <DataCard title={t("home.myClients", { defaultValue: "My Clients" })} badge={roster.length}>
            {clientsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Array(6).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : roster.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{t("home.noClients", { defaultValue: "No clients yet. Add your first client to get started." })}</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {roster.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => navigate(`/practitioner/clients/${c.id}`)}
                    className="flex items-center justify-between gap-3 border border-[#e5e7eb] rounded-lg p-3 text-left hover:-translate-y-0.5 hover:shadow-md transition-all bg-white"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#111827] truncate">{c.name}</div>
                      <div className="text-xs text-[#6b7280] truncate">{c.org}</div>
                      <div className="text-[11px] text-[#9ca3af] mt-0.5">{t("home.sessions", { sessions: c.sessions, defaultValue: "{{sessions}} sessions" })}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {prismBadge(c)}
                      <ChevronRight className="w-4 h-4 text-[#9ca3af]" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </DataCard>
        </div>
      </div>
    </PractitionerLayout>
  )
}
