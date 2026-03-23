import SuperAdminLayout from "@/layouts/SuperAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const AGENT_USAGE = [
  { name: "Meridian", value: 12500 }, { name: "Aura", value: 8200 }, { name: "Nova", value: 7800 },
  { name: "Atlas", value: 5600 }, { name: "Echo", value: 4200 }, { name: "Other", value: 7378 },
]
const ORG_COMPARE = [
  { org: "Acme Corp", users: 2450, engagement: 82 }, { org: "TechStart", users: 1890, engagement: 78 },
  { org: "Global Inc", users: 1650, engagement: 85 }, { org: "DataPrime", users: 1200, engagement: 74 },
]
const SYSTEM_HEALTH = Array.from({ length: 30 }, (_, i) => ({
  day: `D${i + 1}`, responseTime: 120 + Math.floor(Math.random() * 60), errorRate: +(0.1 + Math.random() * 0.5).toFixed(2),
}))
const COLORS = ["#3B5BFF", "#2DD4BF", "#8B5CF6", "#10B981", "#EF4444", "#e9c46a"]

export default function SuperAdminAnalytics() {
  return (
    <SuperAdminLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Platform Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Platform-wide usage, organization comparison, and system health.</p>

      {/* Platform stats */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Users", value: "12,847", color: "#3B5BFF" },
          { label: "Monthly Active", value: "8,234", color: "#10B981" },
          { label: "Daily Active", value: "3,421", color: "#8B5CF6" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            <div className="text-[28px] font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard title="Agent Usage Distribution" className="!mt-0">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart><Pie data={AGENT_USAGE} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {AGENT_USAGE.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Organization Comparison" className="!mt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ORG_COMPARE}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="org" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
              <Bar dataKey="users" fill="#3B5BFF" name="Users" /><Bar dataKey="engagement" fill="#2DD4BF" name="Engagement %" />
            </BarChart>
          </ResponsiveContainer>
        </DataCard>
      </div>

      <DataCard title="System Health (30 days)">
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={SYSTEM_HEALTH}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis yAxisId="left" tick={{ fontSize: 11 }} /><YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} /><Tooltip /><Legend />
            <Area yAxisId="left" type="monotone" dataKey="responseTime" stroke="#3B5BFF" fill="rgba(59,91,255,0.1)" name="Response Time (ms)" />
            <Area yAxisId="right" type="monotone" dataKey="errorRate" stroke="#EF4444" fill="rgba(239,68,68,0.1)" name="Error Rate %" />
          </AreaChart>
        </ResponsiveContainer>
      </DataCard>
    </SuperAdminLayout>
  )
}
