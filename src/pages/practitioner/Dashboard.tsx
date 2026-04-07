import { useTranslation } from "react-i18next";
import PractitionerLayout from "@/layouts/PractitionerLayout"
import WelcomeBanner from "@/components/dashboard/WelcomeBanner"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import { Skeleton } from "@/components/ui/skeleton"
import { usePractitionerSessions, usePractitionerClients, usePractitionerFollowups, usePractitionerCredits } from "@/hooks/practitioner/usePractitioner"

type Session = { name: string; type: string; time: string; status: string; color: string; initials: string; bg: string }
type Client = { name: string; org: string; prism: number; sessions: number; status: string; last: string; tier: string }
type Followup = { name: string; reason: string; due: string; priority: string; dueColor: string }
type CreditBar = { month: string; val: number; h: number }

const FALLBACK_SESSIONS: Session[] = [
  { name: "Marcus Chen", type: "PRISM Debrief", time: "9:00 AM", status: "confirmed", color: "#3B5BFF", initials: "MC", bg: "linear-gradient(135deg,#3B82F6,#6366F1)" },
  { name: "Aisha Patel", type: "Career Coaching", time: "10:30 AM", status: "confirmed", color: "#2DD4BF", initials: "AP", bg: "linear-gradient(135deg,#2DD4BF,#10B981)" },
  { name: "James Morrison", type: "Team Dynamics", time: "1:00 PM", status: "pending", color: "#3B82F6", initials: "JM", bg: "linear-gradient(135deg,#3B82F6,#2563EB)" },
  { name: "Sophie Laurent", type: "Leadership Dev", time: "2:30 PM", status: "confirmed", color: "#8B5CF6", initials: "SL", bg: "linear-gradient(135deg,#8B5CF6,#7C3AED)" },
  { name: "David Kimura", type: "Goal Setting", time: "4:00 PM", status: "pending", color: "#e9c46a", initials: "DK", bg: "linear-gradient(135deg,#e9c46a,#f4a261)" },
]

const FALLBACK_CLIENTS: Client[] = [
  { name: "Marcus Chen", org: "TechCorp Inc", prism: 82, sessions: 12, status: "Active", last: "Mar 15", tier: "mid" },
  { name: "Aisha Patel", org: "GlobalHealth", prism: 78, sessions: 8, status: "Active", last: "Mar 14", tier: "mid" },
  { name: "James Morrison", org: "Finova Group", prism: 85, sessions: 15, status: "Active", last: "Mar 13", tier: "high" },
  { name: "Sophie Laurent", org: "CreativeEdge", prism: 91, sessions: 20, status: "Active", last: "Mar 12", tier: "high" },
  { name: "David Kimura", org: "DataPrime", prism: 76, sessions: 6, status: "New", last: "Mar 11", tier: "mid" },
  { name: "Emma Watson", org: "MediaFlow", prism: 88, sessions: 18, status: "Active", last: "Mar 10", tier: "high" },
  { name: "Ryan Park", org: "BuildRight", prism: 73, sessions: 4, status: "New", last: "Mar 9", tier: "low" },
  { name: "Lisa Fernandez", org: "EduNext", prism: 87, sessions: 14, status: "Active", last: "Mar 8", tier: "high" },
]

const FALLBACK_FOLLOWUPS: Followup[] = [
  { name: "Marcus Chen", reason: "Post-assessment review", due: "Due Today", priority: "high", dueColor: "text-[#EF4444]" },
  { name: "James Morrison", reason: "Goal check-in", due: "Due Today", priority: "high", dueColor: "text-[#EF4444]" },
  { name: "Sophie Laurent", reason: "Session follow-up", due: "Due Tomorrow", priority: "medium", dueColor: "text-[#D97706]" },
  { name: "Emma Watson", reason: "Document review", due: "Due Wed", priority: "medium", dueColor: "text-[#D97706]" },
  { name: "Lisa Fernandez", reason: "Monthly check-in", due: "Due Friday", priority: "low", dueColor: "text-[#10B981]" },
]

const FALLBACK_CREDITS: CreditBar[] = [
  { month: "Oct", val: 6, h: 48 },
  { month: "Nov", val: 8, h: 64 },
  { month: "Dec", val: 5, h: 40 },
  { month: "Jan", val: 10, h: 80 },
  { month: "Feb", val: 9, h: 72 },
  { month: "Mar", val: 7, h: 56 },
]

const prismBg = (tier: string) =>
  tier === "high" ? "bg-[#D1FAE5] text-[#065F46]" : tier === "mid" ? "bg-[#FEF3C7] text-[#92400E]" : "bg-[#FEE2E2] text-[#991B1B]"

const priorityBg = (p: string) =>
  p === "high" ? "bg-[#FEE2E2] text-[#DC2626]" : p === "medium" ? "bg-[#FEF3C7] text-[#D97706]" : "bg-[#D1FAE5] text-[#059669]"

export default function PractitionerDashboard() {
  const { t } = useTranslation(["coaching", "common"]);

  const { data: sessionsData, isLoading: sessionsLoading, error: sessionsError, refetch: refetchSessions } = usePractitionerSessions()
  const { data: clientsData, isLoading: clientsLoading, error: clientsError, refetch: refetchClients } = usePractitionerClients()
  const { data: followupsData, isLoading: followupsLoading, error: followupsError, refetch: refetchFollowups } = usePractitionerFollowups()
  const { data: creditsData } = usePractitionerCredits()

  const sessions = ((sessionsData as { sessions?: Session[] } | undefined)?.sessions ?? FALLBACK_SESSIONS) as Session[]
  const clients = ((clientsData as { clients?: Client[] } | undefined)?.clients ?? FALLBACK_CLIENTS) as Client[]
  const followups = ((followupsData as { followups?: Followup[] } | undefined)?.followups ?? FALLBACK_FOLLOWUPS) as Followup[]
  const credits = ((creditsData as { bars?: CreditBar[] } | undefined)?.bars ?? FALLBACK_CREDITS) as CreditBar[]

  const STATS = [
    { label: t("coaching:practitioner.activeClients"), value: "24", change: "+3 this month", changeColor: "text-[#10B981]" },
    { label: t("coaching:practitioner.creditsRemaining"), value: "38", change: "-5 this week", changeColor: "text-[#EF4444]" },
    { label: t("coaching:practitioner.sessionsThisMonth"), value: "47", change: "+12 vs last month", changeColor: "text-[#10B981]" },
    { label: t("coaching:practitioner.avgClientSatisfaction"), value: "4.8/5", change: "+0.2", changeColor: "text-[#10B981]" },
  ]

  return (
    <PractitionerLayout>
      <WelcomeBanner
        title={t("coaching:practitioner.dashboard")}
        subtitle={t("coaching:practitioner.welcomeBack")}
      >
        <div className="flex gap-6">
          <div className="text-[13px] font-semibold opacity-85"><strong className="text-lg block opacity-100">24</strong> {t("coaching:practitioner.activeClients")}</div>
          <div className="text-[13px] font-semibold opacity-85"><strong className="text-lg block opacity-100">84</strong> PRISM Score</div>
        </div>
      </WelcomeBanner>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-[10px] p-4 hover:shadow-sm transition-shadow">
            <div className="text-xs text-[#6b7280] mb-1">{s.label}</div>
            <div className="text-2xl font-extrabold text-[#111827]">{s.value}</div>
            <div className={`text-[11px] font-semibold mt-1 ${s.changeColor}`}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Today's Sessions */}
      <DataCard title={t("coaching:practitioner.todaysSessions")}>
        {sessionsError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchSessions()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        {sessionsLoading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
          : sessions.map((s) => (
              <div key={s.name} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-b-0">
                <div className="w-[3px] h-10 rounded shrink-0" style={{ backgroundColor: s.color }} />
                <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0" style={{ background: s.bg }}>{s.initials}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-[#1f2937]">{s.name}</div>
                  <div className="text-[11px] text-[#6b7280]">{s.type}</div>
                </div>
                <span className="text-xs font-semibold text-[#374151] shrink-0">{s.time}</span>
                <StatusBadge status={s.status} label={s.status === "confirmed" ? "Confirmed" : "Pending"} />
              </div>
            ))
        }
      </DataCard>

      {/* Client Portfolio */}
      <DataCard title={t("coaching:practitioner.clientPortfolio")}>
        {clientsError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchClients()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Client Name", "Organization", "PRISM Score", "Sessions", "Status", "Last Session"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientsLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td></tr>
                  ))
                : clients.map((c) => (
                    <tr key={c.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#374151]">{c.name}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{c.org}</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${prismBg(c.tier)}`}>{c.prism}</span>
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{c.sessions}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={c.status.toLowerCase()} label={c.status} /></td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{c.last}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Follow-Ups Due */}
      <DataCard title={t("coaching:practitioner.followUpsDueThisWeek")} badge={5}>
        {followupsError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchFollowups()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        {followupsLoading
          ? Array(4).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full mb-2" />)
          : followups.map((f) => (
              <div key={f.name + f.reason} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-b-0">
                <span className={`text-[10px] font-bold px-2 py-[3px] rounded-md uppercase min-w-[60px] text-center shrink-0 ${priorityBg(f.priority)}`}>{f.priority}</span>
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-[#1f2937]">{f.name}</div>
                  <div className="text-[11px] text-[#6b7280]">{f.reason}</div>
                </div>
                <span className={`text-xs font-semibold shrink-0 ${f.dueColor}`}>{f.due}</span>
              </div>
            ))
        }
      </DataCard>

      {/* Credit Usage */}
      <DataCard title={t("coaching:practitioner.creditUsage")}>
        <div className="flex items-end gap-4 h-[140px] pt-2.5">
          {credits.map((c) => (
            <div key={c.month} className="flex flex-col items-center flex-1">
              <span className="text-[11px] font-bold text-[#374151] mb-1">{c.val}</span>
              <div className="w-8 rounded-t-md bg-[#3B5BFF] hover:opacity-80 transition-opacity" style={{ height: c.h }} />
              <span className="text-[11px] text-[#6b7280] mt-2 font-medium">{c.month}</span>
            </div>
          ))}
        </div>
      </DataCard>
    </PractitionerLayout>
  )
}
