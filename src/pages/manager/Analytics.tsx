import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"

const ENGAGEMENT = [
  { name: "Alex T.", sessions: 12 }, { name: "Maria G.", sessions: 9 }, { name: "James W.", sessions: 14 },
  { name: "Sarah L.", sessions: 7 }, { name: "Chris M.", sessions: 11 }, { name: "Priya P.", sessions: 10 },
]
const GOALS = [
  { name: "Alex T.", completed: 5, inProgress: 2, notStarted: 0 }, { name: "Maria G.", completed: 3, inProgress: 1, notStarted: 1 },
  { name: "James W.", completed: 6, inProgress: 2, notStarted: 0 }, { name: "Sarah L.", completed: 4, inProgress: 1, notStarted: 1 },
  { name: "Chris M.", completed: 7, inProgress: 1, notStarted: 0 }, { name: "Priya P.", completed: 4, inProgress: 1, notStarted: 0 },
]
const HIRING_STAGES = [{ name: "Applied", value: 47 }, { name: "Screening", value: 18 }, { name: "Interview", value: 8 }, { name: "Offer", value: 3 }, { name: "Hired", value: 2 }]
const TIME_TO_HIRE = [{ position: "Frontend", days: 21 }, { position: "Backend", days: 28 }, { position: "PM", days: 18 }, { position: "Designer", days: 24 }, { position: "Analyst", days: 20 }]
const MEMBER_TREND = [{ month: "Oct", score: 78 }, { month: "Nov", score: 80 }, { month: "Dec", score: 79 }, { month: "Jan", score: 83 }, { month: "Feb", score: 85 }, { month: "Mar", score: 88 }]
const STAGE_COLORS = ["#3B5BFF", "#2DD4BF", "#ECC94B", "#10B981", "#8B5CF6"]

export default function ManagerAnalytics() {
  return (
    <ManagerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Team Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track coaching engagement, goals, training, and hiring metrics.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard title="Coaching Engagement by Member" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ENGAGEMENT}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="sessions" fill="#3B5BFF" radius={[4, 4, 0, 0]} /></BarChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Goal Completion" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={GOALS}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
              <Bar dataKey="completed" stackId="a" fill="#10B981" /><Bar dataKey="inProgress" stackId="a" fill="#ECC94B" /><Bar dataKey="notStarted" stackId="a" fill="#e5e7eb" />
            </BarChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Member Performance Trend" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MEMBER_TREND}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis domain={[70, 95]} tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="score" stroke="#3B5BFF" strokeWidth={2} /></LineChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Candidates by Stage" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={HIRING_STAGES} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
              {HIRING_STAGES.map((_, i) => <Cell key={i} fill={STAGE_COLORS[i]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </DataCard>
      </div>

      <DataCard title="Time to Hire by Position">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={TIME_TO_HIRE} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="position" type="category" tick={{ fontSize: 11 }} width={80} /><Tooltip /><Bar dataKey="days" fill="#8B5CF6" radius={[0, 4, 4, 0]} /></BarChart>
        </ResponsiveContainer>
      </DataCard>
    </ManagerLayout>
  )
}
