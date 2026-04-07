import { useTranslation } from "react-i18next";
import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import ProgressBar from "@/components/dashboard/ProgressBar"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerTeam } from "@/hooks/manager/useManagerTeam"

type Member = { id: string; name: string; role: string; avatar: string; bg: string; prism: number; goals: string; training: number; status: string; lastActive: string }

const FALLBACK_MEMBERS: Member[] = [
  { id: "tm-1", name: "Alex Thompson", role: "Senior Developer", avatar: "AT", bg: "#3B82F6", prism: 88, goals: "5/7", training: 92, status: "active", lastActive: "2 hours ago" },
  { id: "tm-2", name: "Maria Garcia", role: "UX Designer", avatar: "MG", bg: "#8B5CF6", prism: 82, goals: "3/5", training: 88, status: "active", lastActive: "1 hour ago" },
  { id: "tm-3", name: "James Wilson", role: "Product Manager", avatar: "JW", bg: "#E53E3E", prism: 91, goals: "6/8", training: 95, status: "meeting", lastActive: "30 min ago" },
  { id: "tm-4", name: "Sarah Lee", role: "Data Analyst", avatar: "SL", bg: "#2DD4BF", prism: 79, goals: "4/6", training: 85, status: "active", lastActive: "3 hours ago" },
  { id: "tm-5", name: "Chris Martin", role: "DevOps Engineer", avatar: "CM", bg: "#6B7280", prism: 85, goals: "7/8", training: 90, status: "away", lastActive: "Yesterday" },
  { id: "tm-6", name: "Priya Patel", role: "QA Lead", avatar: "PP", bg: "#10B981", prism: 87, goals: "4/5", training: 96, status: "active", lastActive: "45 min ago" },
]

export default function ManagerTeam() {
  const { t } = useTranslation(["admin", "common"]);
  const { data: teamData, isLoading, error, refetch } = useManagerTeam()

  const members = ((teamData as { members?: Member[] } | undefined)?.members ?? FALLBACK_MEMBERS) as Member[]

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">{t("admin:manager.teamManagement")}</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">{t("admin:manager.manageDescription")}</p>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Members", value: "14", change: "+2 this quarter" },
          { label: "Avg PRISM Score", value: "85", change: "+3 pts" },
          { label: "Goals On Track", value: "78%", change: "+5%" },
          { label: "Training Completion", value: "91%", change: "+8%" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
            <div className="text-[11px] font-semibold text-[#10B981] mt-0.5">{s.change}</div>
          </div>
        ))}
      </div>

      {/* Team Members Detail */}
      <DataCard title={t("admin:manager.directReports")}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Member", "PRISM Score", "Goals", "Training", "Status", "Last Active"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(6).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td></tr>
                  ))
                : members.map((m) => (
                    <tr key={m.id} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0" style={{ backgroundColor: m.bg }}>{m.avatar}</div>
                          <div>
                            <div className="text-[13px] font-semibold text-[#1f2937]">{m.name}</div>
                            <div className="text-[11px] text-[#6b7280]">{m.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2 w-[120px]">
                          <div className="flex-1 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[#3B5BFF]" style={{ width: `${m.prism}%` }} />
                          </div>
                          <span className="text-xs font-semibold text-[#374151] w-7 text-right">{m.prism}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[13px] text-[#374151] font-medium">{m.goals}</td>
                      <td className="px-3 py-3">
                        <ProgressBar value={m.training} color="#10B981" showPct />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={m.status === "In Meeting" ? "meeting" : m.status.toLowerCase()} label={m.status === "meeting" ? "In Meeting" : m.status.charAt(0).toUpperCase() + m.status.slice(1)} />
                      </td>
                      <td className="px-3 py-3 text-xs text-[#6b7280]">{m.lastActive}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Training Assignments */}
      <DataCard title={t("admin:manager.trainingOverview")}>
        <div className="space-y-3">
          {[
            { name: "PRISM Fundamentals", assigned: 14, completed: 13, pct: 93, color: "#3B5BFF" },
            { name: "Leadership Essentials", assigned: 14, completed: 11, pct: 79, color: "#8B5CF6" },
            { name: "Communication Skills", assigned: 8, completed: 8, pct: 100, color: "#10B981" },
            { name: "Conflict Resolution", assigned: 6, completed: 4, pct: 67, color: "#2DD4BF" },
          ].map((t) => (
            <div key={t.name} className="flex items-center gap-3">
              <span className="text-[13px] font-medium text-[#374151] w-[180px] shrink-0">{t.name}</span>
              <div className="flex-1"><ProgressBar value={t.pct} color={t.color} showPct={false} /></div>
              <span className="text-xs text-[#6b7280] w-[80px] shrink-0 text-right">{t.completed}/{t.assigned} done</span>
            </div>
          ))}
        </div>
      </DataCard>
    </ManagerLayout>
  )
}
