import ManagerLayout from "@/layouts/ManagerLayout"
import WelcomeBanner from "@/components/dashboard/WelcomeBanner"
import DataCard from "@/components/dashboard/DataCard"
import ProgressBar from "@/components/dashboard/ProgressBar"
import StatusBadge from "@/components/dashboard/StatusBadge"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { useAuth } from "@/context/useAuth"

const STATS = [
  { label: "Team Members", value: "14", change: "+2 this quarter", changeColor: "text-[#10B981]" },
  { label: "Active Goals", value: "23", change: "+5 this month", changeColor: "text-[#3B5BFF]" },
  { label: "Avg PRISM Score", value: "82", change: "+3 pts", changeColor: "text-[#10B981]" },
  { label: "Training Completion", value: "91%", change: "+8%", changeColor: "text-[#10B981]" },
]

const PRISM_BARS = [
  { label: "Gold (Drive)", pct: 78, color: "#E53E3E" },
  { label: "Green (Influence)", pct: 85, color: "#38A169" },
  { label: "Yellow (Steadiness)", pct: 72, color: "#ECC94B" },
  { label: "Blue (Compliance)", pct: 88, color: "#3182CE" },
]

const MINI_STATS = [
  { val: "3", label: "Open Positions", color: "#3B5BFF" },
  { val: "47", label: "Total Candidates", color: "#0D9488" },
  { val: "8", label: "Interviews This Week", color: "#3B82F6" },
  { val: "23", label: "Avg Time to Hire (days)", color: "#8B5CF6" },
]

const INTERVIEWS = [
  { time: "9:00 AM", name: "Sarah Chen", pos: "Frontend Developer", color: "#38A169" },
  { time: "10:30 AM", name: "Marcus Johnson", pos: "Product Manager", color: "#3B82F6" },
  { time: "1:00 PM", name: "Elena Rodriguez", pos: "UX Designer", color: "#3B5BFF" },
  { time: "2:30 PM", name: "David Kim", pos: "Backend Engineer", color: "#2DD4BF" },
  { time: "4:00 PM", name: "Lisa Wang", pos: "Data Analyst", color: "#8B5CF6" },
]

const TEAM = [
  { initials: "AT", name: "Alex Thompson", role: "Senior Developer", prism: 88, bg: "#3B82F6", status: "Active" },
  { initials: "MG", name: "Maria Garcia", role: "UX Designer", prism: 82, bg: "#8B5CF6", status: "Active" },
  { initials: "JW", name: "James Wilson", role: "Product Manager", prism: 91, bg: "#E53E3E", status: "In Meeting" },
  { initials: "SL", name: "Sarah Lee", role: "Data Analyst", prism: 79, bg: "#2DD4BF", status: "Active" },
  { initials: "CM", name: "Chris Martin", role: "DevOps Engineer", prism: 85, bg: "#6B7280", status: "Away" },
  { initials: "PP", name: "Priya Patel", role: "QA Lead", prism: 87, bg: "#10B981", status: "Active" },
]

export default function ManagerDashboard() {
  const { user } = useAuth()
  const name = user?.fullName ?? user?.name ?? "Manager"

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <WelcomeBanner
        title="Team Manager Dashboard"
        subtitle={`Welcome back, ${name}. Your team of 14 is performing well this quarter.`}
      >
        <div className="flex gap-2">
          <button className="bg-white/20 text-white rounded-md px-3.5 py-[7px] text-xs font-semibold hover:bg-white/30 transition-colors">View Reports</button>
          <button className="bg-transparent text-white border border-white/30 rounded-md px-3.5 py-[7px] text-xs font-semibold hover:bg-white/10 transition-colors">Schedule 1:1</button>
        </div>
      </WelcomeBanner>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5 hover:shadow-sm transition-shadow">
            <div className="text-xs text-[#6b7280] mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
            <div className={`text-[11px] font-semibold mt-0.5 ${s.changeColor}`}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Team PRISM Overview */}
      <DataCard title="Team PRISM Overview">
        <div className="space-y-2.5">
          {PRISM_BARS.map((b) => (
            <ProgressBar key={b.label} label={b.label} value={b.pct} color={b.color} />
          ))}
        </div>
      </DataCard>

      {/* Hiring Pipeline */}
      <DataCard title="Hiring Pipeline">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {MINI_STATS.map((s) => (
            <div key={s.label} className="bg-[#f9fafb] rounded-md p-3 text-center">
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[11px] text-[#6b7280] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </DataCard>

      {/* Today's Interviews */}
      <DataCard title="Today's Interviews">
        {INTERVIEWS.map((i) => (
          <div key={i.name} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-b-0">
            <span className="text-xs font-semibold text-[#6b7280] w-[70px] shrink-0">{i.time}</span>
            <span className="text-[13px] font-semibold text-[#1f2937] flex-1">{i.name}</span>
            <span className="text-xs text-[#6b7280] flex-1">{i.pos}</span>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: i.color }} />
          </div>
        ))}
      </DataCard>

      {/* Team Members */}
      <DataCard title="Team Members">
        {TEAM.map((m) => (
          <div key={m.name} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-b-0">
            <div className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-white font-bold text-[11px] shrink-0" style={{ backgroundColor: m.bg }}>{m.initials}</div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-[#1f2937]">{m.name}</div>
              <div className="text-[11px] text-[#6b7280]">{m.role}</div>
            </div>
            <div className="flex items-center gap-2 w-[140px] shrink-0">
              <div className="flex-1 h-1.5 bg-[#f3f4f6] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-[#3B5BFF]" style={{ width: `${m.prism}%` }} />
              </div>
              <span className="text-xs font-semibold text-[#374151] w-7 text-right">{m.prism}</span>
            </div>
            <StatusBadge status={m.status === "In Meeting" ? "meeting" : m.status.toLowerCase()} label={m.status} />
          </div>
        ))}
      </DataCard>
    </ManagerLayout>
  )
}
