import UserLayout from "@/layouts/UserLayout"
import DataCard from "@/components/dashboard/DataCard"
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const SESSIONS = Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, sessions: Math.floor(Math.random() * 6) + 3 }))
const GOALS = Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, completed: Math.min(i, 5), total: 8 }))
const AGENTS = [{ name: "Meridian", value: 35 }, { name: "Aura", value: 22 }, { name: "Nova", value: 18 }, { name: "Atlas", value: 14 }, { name: "Echo", value: 11 }]
const SATISFACTION = [{ month: "Oct", score: 4.1 }, { month: "Nov", score: 4.3 }, { month: "Dec", score: 4.0 }, { month: "Jan", score: 4.5 }, { month: "Feb", score: 4.6 }, { month: "Mar", score: 4.8 }]
const PRISM_GROWTH = [
  { assessment: "Initial", R: 65, Y: 58, G: 72, B: 60 },
  { assessment: "Q1", R: 68, Y: 62, G: 75, B: 64 },
  { assessment: "Q2", R: 72, Y: 65, G: 78, B: 68 },
  { assessment: "Current", R: 75, Y: 70, G: 82, B: 72 },
]
const COLORS = ["#3B5BFF", "#2DD4BF", "#8B5CF6", "#10B981", "#EF4444"]

export default function UserAnalytics() {
  return (
    <UserLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Your Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track your coaching journey, goals, and personal growth.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard title="Sessions Per Week" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={SESSIONS}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="sessions" stroke="#3B5BFF" strokeWidth={2} dot={{ r: 3 }} /></LineChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Goals Progress" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={GOALS}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="completed" stroke="#10B981" fill="#D1FAE5" /><Area type="monotone" dataKey="total" stroke="#9ca3af" fill="transparent" strokeDasharray="5 5" /></AreaChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Most-Used Agents" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={AGENTS} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {AGENTS.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Satisfaction Trend" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={SATISFACTION}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis domain={[3, 5]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#2DD4BF" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </DataCard>
      </div>

      <DataCard title="PRISM Growth Trajectory">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={PRISM_GROWTH}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="assessment" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
            <Bar dataKey="R" fill="#E53E3E" name="Red" /><Bar dataKey="Y" fill="#ECC94B" name="Yellow" /><Bar dataKey="G" fill="#38A169" name="Green" /><Bar dataKey="B" fill="#3182CE" name="Blue" />
          </BarChart>
        </ResponsiveContainer>
      </DataCard>
    </UserLayout>
  )
}
