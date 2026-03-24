import { useNavigate } from "react-router-dom"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import WelcomeBanner from "@/components/dashboard/WelcomeBanner"
import DataCard from "@/components/dashboard/DataCard"
import ProgressBar from "@/components/dashboard/ProgressBar"
import { useAuth } from "@/context/useAuth"
import { Info } from "lucide-react"

const STATS = [
  { label: "Total Employees", value: "247", change: "+12 this month", icon: "bg-[rgba(59,91,255,0.1)]" },
  { label: "Active Teams", value: "12", change: "+2", icon: "bg-[rgba(59,91,255,0.1)]" },
  { label: "Training Completion", value: "78%", change: "+5%", icon: "bg-[rgba(16,185,129,0.1)]" },
  { label: "PRISM Assessed", value: "89%", change: "+8%", icon: "bg-[rgba(16,185,129,0.1)]" },
]

const DEPARTMENTS = [
  { name: "Engineering", count: 68, color: "#3B5BFF" },
  { name: "Marketing", count: 34, color: "#2DD4BF" },
  { name: "Sales", count: 45, color: "#10B981" },
  { name: "HR", count: 18, color: "#8B5CF6" },
  { name: "Product", count: 28, color: "#3B82F6" },
  { name: "Design", count: 22, color: "#e9c46a" },
  { name: "Finance", count: 16, color: "#EF4444" },
  { name: "Operations", count: 16, color: "#4b5563" },
]

const TEAMS = [
  { name: "Frontend Team", dept: "Engineering", lead: "Alex Thompson", members: 8, score: 86, tier: "high" },
  { name: "Backend Team", dept: "Engineering", lead: "Chris Martin", members: 10, score: 84, tier: "high" },
  { name: "Brand & Content", dept: "Marketing", lead: "Maria Garcia", members: 7, score: 82, tier: "mid" },
  { name: "Growth Marketing", dept: "Marketing", lead: "James Wilson", members: 6, score: 79, tier: "low" },
  { name: "Enterprise Sales", dept: "Sales", lead: "Sarah Lee", members: 12, score: 88, tier: "high" },
  { name: "SMB Sales", dept: "Sales", lead: "David Chen", members: 9, score: 81, tier: "mid" },
  { name: "Product Design", dept: "Design", lead: "Priya Patel", members: 5, score: 90, tier: "high" },
  { name: "Core Product", dept: "Product", lead: "Tom Harris", members: 8, score: 85, tier: "high" },
]

const TRAINING_BARS = [
  { label: "Engineering", pct: 82, color: "#3B5BFF" },
  { label: "Marketing", pct: 76, color: "#2DD4BF" },
  { label: "Sales", pct: 91, color: "#10B981" },
  { label: "HR", pct: 88, color: "#8B5CF6" },
  { label: "Product", pct: 73, color: "#3B82F6" },
  { label: "Design", pct: 85, color: "#e9c46a" },
  { label: "Finance", pct: 79, color: "#F87171" },
  { label: "Operations", pct: 71, color: "#6b7280" },
]

const HEALTH = [
  { label: "Employee Engagement", value: "87%", color: "#10B981" },
  { label: "Retention Rate", value: "94%", color: "#3B5BFF" },
  { label: "PRISM Alignment", value: "82%", color: "#8B5CF6" },
]

const scoreBg = (tier: string) =>
  tier === "high" ? "bg-[#D1FAE5] text-[#38A169]" : tier === "mid" ? "bg-[#DBEAFE] text-[#3182CE]" : "bg-[#FEF9C3] text-[#92400E]"

export default function CompanyAdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const orgName = (user as Record<string, unknown> | null)?.organizationName as string ?? "Your Organization"

  return (
    <CompanyAdminLayout>
      {/* Placeholder Data Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[13px] text-amber-800">
          Dashboard data is currently placeholder. Live data integration is in progress.
        </p>
      </div>

      <WelcomeBanner
        title={`${orgName} Dashboard`}
        subtitle="Manage your organization's teams, training, and PRISM assessments across all departments."
      >
        <div className="flex gap-5 flex-wrap">
          <span className="text-[13px] font-semibold opacity-95">247 Employees</span>
          <span className="text-[13px] font-semibold opacity-95">12 Teams</span>
          <span className="text-[13px] font-semibold opacity-95">78% Trained</span>
        </div>
      </WelcomeBanner>

      {/* Stats — clickable tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {STATS.map((s) => {
          const link =
            s.label === "Total Employees" ? "/company-admin/users"
            : s.label === "Active Teams" ? "/company-admin/organization"
            : s.label === "Training Completion" ? "/company-admin/training"
            : s.label === "PRISM Assessed" ? "/company-admin/analytics"
            : undefined
          return (
            <button
              key={s.label}
              onClick={() => link && navigate(link)}
              className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 hover:shadow-md hover:border-[#3B5BFF]/30 transition-all text-left cursor-pointer"
            >
              <div className="text-xs text-[#6b7280]">{s.label}</div>
              <div className="text-2xl font-extrabold text-[#111827] my-1">{s.value}</div>
              <div className="text-[11px] font-semibold text-[#10B981]">{s.change}</div>
            </button>
          )
        })}
      </div>

      {/* Departments */}
      <DataCard title="Departments">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DEPARTMENTS.map((d) => (
            <div key={d.name} className="bg-white border border-[#e5e7eb] rounded-lg p-3 border-l-[3px] hover:shadow-sm transition-shadow" style={{ borderLeftColor: d.color }}>
              <div className="text-[13px] font-semibold text-[#1f2937]">{d.name}</div>
              <div className="text-xs text-[#6b7280] mt-0.5">{d.count} employees</div>
            </div>
          ))}
        </div>
      </DataCard>

      {/* Teams */}
      <DataCard title="Teams">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">Team Name</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">Department</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">Team Lead</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">Members</th>
                <th className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">Avg PRISM Score</th>
              </tr>
            </thead>
            <tbody>
              {TEAMS.map((t) => (
                <tr key={t.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{t.name}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{t.dept}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{t.lead}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{t.members}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${scoreBg(t.tier)}`}>
                      {t.score}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Training Progress */}
      <DataCard title="Training Progress by Department">
        <div className="space-y-2.5">
          {TRAINING_BARS.map((b) => (
            <ProgressBar key={b.label} label={b.label} value={b.pct} color={b.color} />
          ))}
        </div>
      </DataCard>

      {/* Organization Health */}
      <DataCard title="Organization Health">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {HEALTH.map((h) => (
            <div key={h.label} className="text-center p-5 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]">
              <div className="text-xs font-semibold text-[#6b7280] flex items-center justify-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: h.color }} />
                {h.label}
              </div>
              <div className="text-[32px] font-extrabold mt-1.5" style={{ color: h.color }}>{h.value}</div>
            </div>
          ))}
        </div>
      </DataCard>
    </CompanyAdminLayout>
  )
}
