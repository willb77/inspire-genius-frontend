import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import DataCard from "./DataCard"

type CostLevel = "platform" | "company" | "team" | "user"

type CostKPI = { label: string; value: string; change: string; changeColor: string }
type CostByWeek = { name: string; cost: number }
type CostDistribution = { name: string; value: number; color: string }
type TopItem = { name: string; col2: string; col3: string }

type CostDashboardProps = {
  level: CostLevel
  kpis: CostKPI[]
  costByWeek?: CostByWeek[]
  costDistribution?: CostDistribution[]
  topItems?: { title: string; headers: [string, string, string]; rows: TopItem[] }
  dateRange?: string
  onDateRangeChange?: (range: string) => void
}

const COLORS = ["#00A3A3", "#10B981", "#3B82F6", "#F27B16", "#8B5CF6", "#EC4899"]

export default function CostDashboard({
  level,
  kpis,
  costByWeek = [],
  costDistribution = [],
  topItems,
  dateRange = "30d",
  onDateRangeChange,
}: CostDashboardProps) {
  const [range, setRange] = useState(dateRange)

  function handleRangeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setRange(e.target.value)
    onDateRangeChange?.(e.target.value)
  }

  const levelLabel = { platform: "Platform", company: "Company", team: "Team", user: "User" }[level]

  return (
    <div className="mt-5">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[15px] font-bold text-[#111827]">{levelLabel} Cost Overview</h3>
        <div className="flex items-center gap-2">
          <select
            value={range}
            onChange={handleRangeChange}
            className="px-2 py-1 border border-[#e5e7eb] rounded text-xs focus:ring-1 focus:ring-[#00A3A3] outline-none"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button className="flex items-center gap-1 px-2 py-1 bg-[#00A3A3] text-white rounded text-xs font-medium hover:bg-[#008F8F] transition-colors">
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-lg p-3 border border-[#e5e7eb] hover:-translate-y-0.5 hover:shadow-md transition-all">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6b7280]">{kpi.label}</span>
              <span className={`text-xs font-semibold ${kpi.changeColor}`}>{kpi.change}</span>
            </div>
            <div className="text-lg font-bold text-[#111827] mt-0.5">{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      {(costByWeek.length > 0 || costDistribution.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          {costByWeek.length > 0 && (
            <DataCard title="Cost by Period" className="lg:col-span-2 !mt-0">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={costByWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="cost" fill="#00A3A3" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </DataCard>
          )}
          {costDistribution.length > 0 && (
            <DataCard title="Cost Distribution" className="!mt-0">
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={costDistribution} dataKey="value" cx="50%" cy="50%" outerRadius={40} strokeWidth={1}>
                      {costDistribution.map((entry, i) => (
                        <Cell key={entry.name} fill={entry.color || COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1">
                  {costDistribution.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color || COLORS[i % COLORS.length] }} />
                        <span className="text-[#4b5563]">{d.name}</span>
                      </div>
                      <span className="font-medium">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </DataCard>
          )}
        </div>
      )}

      {/* Top Items Table */}
      {topItems && topItems.rows.length > 0 && (
        <DataCard title={topItems.title} className="!mt-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#e5e7eb]">
                {topItems.headers.map((h) => (
                  <th key={h} className="text-left py-1.5 font-semibold text-[#6b7280]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topItems.rows.map((row) => (
                <tr key={row.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] cursor-pointer">
                  <td className="py-1.5 font-medium text-[#111827]">{row.name}</td>
                  <td className="py-1.5 text-[#4b5563]">{row.col2}</td>
                  <td className="py-1.5 font-medium text-[#111827] text-right">{row.col3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataCard>
      )}
    </div>
  )
}
