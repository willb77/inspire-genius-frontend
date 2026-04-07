import PractitionerLayout from "@/layouts/PractitionerLayout"
import DataCard from "@/components/dashboard/DataCard"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { usePractitionerAnalytics } from "@/hooks/analytics/useAnalytics"

const FALLBACK_CLIENTS = [
  { client: "Sophie L.", sessions: 20 }, { client: "Emma W.", sessions: 18 }, { client: "James M.", sessions: 15 },
  { client: "Lisa F.", sessions: 14 }, { client: "Marcus C.", sessions: 12 }, { client: "Aisha P.", sessions: 8 },
]
const FALLBACK_WEEKLY = Array.from({ length: 12 }, (_, i) => ({ week: `W${i + 1}`, sessions: Math.floor(Math.random() * 5) + 5 }))
const FALLBACK_PRISM_RATES = [{ name: "Completed", value: 18 }, { name: "In Progress", value: 4 }, { name: "Not Started", value: 2 }]
const P_COLORS = ["#10B981", "#ECC94B", "#e5e7eb"]

export default function PractitionerAnalytics() {
  const { data: analyticsData, isLoading, error, refetch } = usePractitionerAnalytics()

  const ad = analyticsData as {
    clients?: typeof FALLBACK_CLIENTS;
    weekly?: typeof FALLBACK_WEEKLY;
    prismRates?: typeof FALLBACK_PRISM_RATES;
  } | undefined

  const CLIENTS = ad?.clients ?? FALLBACK_CLIENTS
  const WEEKLY = ad?.weekly ?? FALLBACK_WEEKLY
  const PRISM_RATES = ad?.prismRates ?? FALLBACK_PRISM_RATES

  return (
    <PractitionerLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Practice Analytics</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Client engagement, session frequency, and PRISM completion metrics.</p>

      {error && (
        <div className="flex items-center gap-2 py-2 mb-4 text-[13px] text-[#EF4444]">
          Failed to load analytics data.
          <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard title="Client Engagement (Top 6)" className="!mt-0">
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={CLIENTS}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="client" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="sessions" fill="#3B5BFF" radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          )}
        </DataCard>

        <DataCard title="Weekly Session Frequency" className="!mt-0">
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={WEEKLY}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="week" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="sessions" stroke="#2DD4BF" strokeWidth={2} /></LineChart>
            </ResponsiveContainer>
          )}
        </DataCard>

        <DataCard title="PRISM Completion Rates" className="!mt-0 lg:col-span-2">
          {isLoading ? <Skeleton className="h-[200px] w-full" /> : (
            <div className="flex items-center gap-8">
              <ResponsiveContainer width={200} height={200}>
                <PieChart><Pie data={PRISM_RATES} dataKey="value" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {PRISM_RATES.map((_, i) => <Cell key={i} fill={P_COLORS[i]} />)}
                </Pie><Tooltip /></PieChart>
              </ResponsiveContainer>
              <div className="space-y-2">
                {PRISM_RATES.map((r, i) => (
                  <div key={r.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: P_COLORS[i] }} />
                    <span className="text-[13px] text-[#374151]">{r.name}: <strong>{r.value}</strong> clients</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DataCard>
      </div>
    </PractitionerLayout>
  )
}
