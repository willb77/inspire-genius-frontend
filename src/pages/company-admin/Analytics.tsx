import { useCallback } from "react"
import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { Button } from "@/components/ui/button"
import { FileJson, FileSpreadsheet, Info } from "lucide-react"
import { toast } from "sonner"

const DEPT = [
  { dept: "Engineering", engagement: 88, training: 82, prism: 84 }, { dept: "Marketing", engagement: 76, training: 76, prism: 79 },
  { dept: "Sales", engagement: 92, training: 91, prism: 86 }, { dept: "HR", engagement: 85, training: 88, prism: 81 },
  { dept: "Product", engagement: 80, training: 73, prism: 83 }, { dept: "Design", engagement: 78, training: 85, prism: 88 },
]
const ENGAGEMENT = Array.from({ length: 12 }, (_, i) => ({ month: `M${i + 1}`, pct: 70 + Math.floor(Math.random() * 20) }))
const LICENSE = [{ name: "Active", value: 192 }, { name: "Unused", value: 55 }, { name: "Pending", value: 12 }]
const COST_TREND = [{ month: "Oct", cost: 410 }, { month: "Nov", cost: 395 }, { month: "Dec", cost: 420 }, { month: "Jan", cost: 445 }, { month: "Feb", cost: 430 }, { month: "Mar", cost: 433 }]
const L_COLORS = ["#10B981", "#e5e7eb", "#3B5BFF"]

function download(content: string, name: string, type: string) {
  const b = new Blob([content], { type }); const u = URL.createObjectURL(b)
  const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u)
}

export default function CompanyAdminAnalytics() {
  const exportCSV = useCallback(() => { download("dept,engagement,training,prism\n" + DEPT.map((d) => `${d.dept},${d.engagement},${d.training},${d.prism}`).join("\n"), "company-analytics.csv", "text/csv"); toast.success("Exported CSV") }, [])
  const exportJSON = useCallback(() => { download(JSON.stringify(DEPT, null, 2), "company-analytics.json", "application/json"); toast.success("Exported JSON") }, [])

  return (
    <CompanyAdminLayout>
      {/* Placeholder Data Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[13px] text-amber-800">
          Analytics data is currently placeholder. Live metrics and reporting are in progress.
        </p>
      </div>

      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Company Analytics</h1>
          <p className="text-[13px] text-[#6b7280]">Organization-level engagement, training, and cost metrics.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={exportJSON}><FileJson className="w-4 h-4" />JSON</Button>
          <Button variant="outline" size="sm" className="gap-1" onClick={exportCSV}><FileSpreadsheet className="w-4 h-4" />CSV</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <DataCard title="Department Comparison" className="!mt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={DEPT}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="dept" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend />
              <Bar dataKey="engagement" fill="#3B5BFF" name="Engagement" /><Bar dataKey="training" fill="#2DD4BF" name="Training" /><Bar dataKey="prism" fill="#8B5CF6" name="PRISM" />
            </BarChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Company Engagement Trend" className="!mt-0">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={ENGAGEMENT}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis domain={[60, 100]} tick={{ fontSize: 11 }} /><Tooltip /><Area type="monotone" dataKey="pct" stroke="#3B5BFF" fill="rgba(59,91,255,0.1)" /></AreaChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="License Utilization" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={LICENSE} dataKey="value" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
              {LICENSE.map((_, i) => <Cell key={i} fill={L_COLORS[i]} />)}
            </Pie><Tooltip /></PieChart>
          </ResponsiveContainer>
        </DataCard>

        <DataCard title="Cost per User Trend" className="!mt-0">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={COST_TREND}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="month" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Line type="monotone" dataKey="cost" stroke="#EF4444" strokeWidth={2} name="$/user" /></LineChart>
          </ResponsiveContainer>
        </DataCard>
      </div>
    </CompanyAdminLayout>
  )
}
