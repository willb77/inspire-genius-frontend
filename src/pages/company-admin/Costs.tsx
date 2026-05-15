import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import ProgressBar from "@/components/dashboard/ProgressBar"
import { Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanyCosts } from "@/hooks/company-admin/useCompanyAdmin"

const FALLBACK_SUMMARY = [
  { label: "Total Spend (6 mo)", value: "$107,000", change: "+12% vs prior", changeColor: "text-[#EF4444]" },
  { label: "License Cost", value: "$83,200", change: "78% of total", changeColor: "text-[#3B5BFF]" },
  { label: "Training Cost", value: "$23,800", change: "22% of total", changeColor: "text-[#8B5CF6]" },
  { label: "Cost per User", value: "$433", change: "-$18 vs prior", changeColor: "text-[#10B981]" },
]

const FALLBACK_MONTHLY = [
  { month: "Oct", licenses: 12400, training: 3200, total: 15600 },
  { month: "Nov", licenses: 12400, training: 4100, total: 16500 },
  { month: "Dec", licenses: 13200, training: 2800, total: 16000 },
  { month: "Jan", licenses: 14800, training: 5200, total: 20000 },
  { month: "Feb", licenses: 14800, training: 4600, total: 19400 },
  { month: "Mar", licenses: 15600, training: 3900, total: 19500 },
]

const FALLBACK_DEPT_COSTS = [
  { name: "Engineering", users: 68, cost: 29400, pct: 27 },
  { name: "Sales", users: 45, cost: 19500, pct: 18 },
  { name: "Marketing", users: 34, cost: 14700, pct: 14 },
  { name: "Product", users: 28, cost: 12100, pct: 11 },
  { name: "Design", users: 22, cost: 9500, pct: 9 },
  { name: "HR", users: 18, cost: 7800, pct: 7 },
  { name: "Finance", users: 16, cost: 6900, pct: 6 },
  { name: "Operations", users: 16, cost: 7100, pct: 7 },
]

export default function CompanyAdminCosts() {
  const { data: costsData, isLoading, error, refetch } = useCompanyCosts()

  const cd = costsData as {
    summary?: typeof FALLBACK_SUMMARY;
    monthly?: typeof FALLBACK_MONTHLY;
    deptCosts?: typeof FALLBACK_DEPT_COSTS;
  } | undefined

  const SUMMARY = cd?.summary ?? FALLBACK_SUMMARY
  const MONTHLY = cd?.monthly ?? FALLBACK_MONTHLY
  const DEPT_COSTS = cd?.deptCosts ?? FALLBACK_DEPT_COSTS
  const maxTotal = Math.max(...MONTHLY.map((m) => m.total))

  return (
    <CompanyAdminLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Cost Management</h1>
      <p className="text-[13px] text-[#6b7280] mb-3">Track platform costs, license expenses, and training spend.</p>

      {/* Placeholder Data Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[13px] text-amber-800">
          Cost data is currently placeholder. Live billing and license cost tracking is in progress.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {SUMMARY.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="text-xs text-[#6b7280]">{s.label}</div>
            {isLoading ? <Skeleton className="h-8 w-20 my-1" /> : <div className="text-2xl font-bold text-[#111827]">{s.value}</div>}
            <div className={`text-[11px] font-semibold mt-0.5 ${s.changeColor}`}>{s.change}</div>
          </div>
        ))}
      </div>

      {/* Monthly Spend Chart */}
      <DataCard title="Monthly Spend">
        <div className="flex items-end justify-around h-[200px] pt-4 pb-2">
          {MONTHLY.map((m) => (
            <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
              <span className="text-[10px] font-bold text-[#374151]">${(m.total / 1000).toFixed(1)}k</span>
              <div className="w-10 flex flex-col rounded-t-md overflow-hidden" style={{ height: `${(m.total / maxTotal) * 160}px` }}>
                <div className="bg-[#3B5BFF]" style={{ flex: m.licenses / m.total }} />
                <div className="bg-[#8B5CF6]" style={{ flex: m.training / m.total }} />
              </div>
              <span className="text-[11px] text-[#6b7280] font-medium mt-1">{m.month}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-3 justify-center">
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#3B5BFF]" /><span className="text-[11px] text-[#6b7280]">Licenses</span></div>
          <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#8B5CF6]" /><span className="text-[11px] text-[#6b7280]">Training</span></div>
        </div>
      </DataCard>

      {/* Cost by Department */}
      <DataCard title="Cost by Department">
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
                {["Department", "Users", "Total Cost", "% of Total", "Cost/User"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array(5).fill(0).map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-3 py-3">
                      <Skeleton className="h-8 w-full" />
                    </td></tr>
                  ))
                : DEPT_COSTS.map((d) => (
                    <tr key={d.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1f2937]">{d.name}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{d.users}</td>
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#374151]">${d.cost.toLocaleString()}</td>
                      <td className="px-3 py-2.5 w-[140px]">
                        <ProgressBar value={d.pct} color="#3B5BFF" showPct />
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">${Math.round(d.cost / d.users)}</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* License Allocation */}
      <DataCard title="License Allocation">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: "Active Licenses", value: "192", color: "#10B981" },
            { label: "Unused Licenses", value: "55", color: "#D97706" },
            { label: "Pending Activation", value: "12", color: "#3B5BFF" },
          ].map((l) => (
            <div key={l.label} className="text-center p-5 border border-[#e5e7eb] rounded-lg bg-[#f9fafb]">
              <div className="text-xs font-semibold text-[#6b7280]">{l.label}</div>
              <div className="text-[28px] font-extrabold mt-1" style={{ color: l.color }}>{l.value}</div>
            </div>
          ))}
        </div>
      </DataCard>
    </CompanyAdminLayout>
  )
}
