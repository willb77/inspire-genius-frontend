import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { useUserManagement } from "@/hooks/super-admin/user-management/useUserManagement"
import { useCoachesList } from "@/hooks/super-admin/coach-management/useCoaches"
import { useAuditStats } from "@/hooks/audit/useAudit"
import { useFeedbackStats } from "@/hooks/feedback/useFeedback"

const ORG_COMPARE = [
  { org: "Acme Corp", users: 2450, engagement: 82 }, { org: "TechStart", users: 1890, engagement: 78 },
  { org: "Global Inc", users: 1650, engagement: 85 }, { org: "DataPrime", users: 1200, engagement: 74 },
]
const COLORS = ["#3B5BFF", "#2DD4BF", "#8B5CF6", "#10B981", "#EF4444", "#e9c46a"]

export default function SuperAdminAnalytics() {
  const { data: usersData, isLoading: usersLoading } = useUserManagement({ page: 1, limit: 1 })
  const { data: coachesData, isLoading: coachesLoading } = useCoachesList({ page: 1, limit: 20 })
  const { data: auditData, isLoading: auditLoading } = useAuditStats()
  const { data: feedbackData, isLoading: feedbackLoading } = useFeedbackStats()

  const totalUsers = usersData?.data?.pagination?.total
  const feedbackCount = feedbackData?.data?.total_count
  const auditStats = auditData?.data

  // Build agent usage from real coach data
  const coachesRaw = coachesData?.data
  const coachAgentsAll = Array.isArray(coachesRaw)
    ? coachesRaw
    : (coachesRaw as { agents?: { name: string; status?: string }[] })?.agents ?? []
  const coachAgents = coachAgentsAll.filter((a: { status?: string }) => a.status?.toLowerCase() !== "deactivated")
  const agentUsage = coachAgents.length > 0
    ? coachAgents.slice(0, 6).map((agent: { name: string }) => ({ name: agent.name, value: 1 }))
    : [{ name: "No agents", value: 1 }]

  // Build system health from audit top_actions
  const systemHealthData = auditStats?.top_actions?.slice(0, 10).map((a: { action: string; count: number }) => ({
    day: a.action.replace(/_/g, " "),
    responseTime: a.count,
    errorRate: 0,
  })) ?? []

  const isAnyLoading = usersLoading || coachesLoading || auditLoading || feedbackLoading

  return (
    <SuperAdminLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Platform Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Platform-wide usage, organization comparison, and system health.</p>

      {/* Platform stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Users", value: isAnyLoading ? "..." : totalUsers != null ? totalUsers.toLocaleString() : "--", color: "#3B5BFF" },
          { label: "Feedback Submitted", value: isAnyLoading ? "..." : feedbackCount != null ? feedbackCount.toLocaleString() : "--", color: "#10B981" },
          { label: "Audit Events Today", value: isAnyLoading ? "..." : auditStats?.logs_today != null ? auditStats.logs_today.toLocaleString() : "--", color: "#8B5CF6" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            <div className="text-[28px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard title="Agent Usage Distribution" className="!mt-0">
          {coachesLoading ? (
            <div className="flex items-center justify-center h-[220px] text-sm text-[#6b7280]">Loading agents...</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart><Pie data={agentUsage} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {agentUsage.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          )}
        </DataCard>

        <DataCard title="Organization Comparison" className="!mt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ORG_COMPARE}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="org" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
              <Bar dataKey="users" fill="#3B5BFF" name="Users" /><Bar dataKey="engagement" fill="#2DD4BF" name="Engagement %" />
            </BarChart>
          </ResponsiveContainer>
        </DataCard>
      </div>

      <DataCard title="Top Audit Actions">
        {auditLoading ? (
          <div className="flex items-center justify-center h-[220px] text-sm text-[#6b7280]">Loading audit data...</div>
        ) : systemHealthData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-sm text-[#6b7280]">No audit data available yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={systemHealthData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="day" tick={{ fontSize: 9 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip />
              <Bar dataKey="responseTime" fill="#3B5BFF" name="Event Count" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </DataCard>
    </SuperAdminLayout>
  )
}
