import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Building2, Users, Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanyDepartments } from "@/hooks/company-admin/useCompanyAdmin"

type OrgDept = { name: string; headcount: number; teams: number; lead: string }

const FALLBACK_DEPARTMENTS: OrgDept[] = [
  { name: "Engineering", headcount: 68, teams: 4, lead: "VP Engineering" },
  { name: "Marketing", headcount: 34, teams: 3, lead: "VP Marketing" },
  { name: "Sales", headcount: 45, teams: 3, lead: "VP Sales" },
  { name: "Human Resources", headcount: 18, teams: 2, lead: "HR Director" },
  { name: "Product", headcount: 28, teams: 2, lead: "VP Product" },
  { name: "Design", headcount: 22, teams: 2, lead: "Design Director" },
  { name: "Finance", headcount: 16, teams: 1, lead: "CFO" },
  { name: "Operations", headcount: 16, teams: 1, lead: "COO" },
]

const COLORS = ["#3B5BFF", "#2DD4BF", "#10B981", "#8B5CF6", "#3B82F6", "#e9c46a", "#EF4444", "#4b5563"]

export default function CompanyAdminOrganization() {
  const { data: deptsData, isLoading, error, refetch } = useCompanyDepartments()

  const depts = ((deptsData as { departments?: OrgDept[] } | undefined)?.departments ?? FALLBACK_DEPARTMENTS) as OrgDept[]
  const totalHeadcount = depts.reduce((sum, d) => sum + d.headcount, 0)
  const totalTeams = depts.reduce((sum, d) => sum + d.teams, 0)

  return (
    <CompanyAdminLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Organization</h1>
      <p className="text-[13px] text-[#6b7280] mb-3">Organization structure, departments, and team hierarchy.</p>

      {/* Placeholder Data Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-5 flex items-start gap-2">
        <Info className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[13px] text-amber-800">
          Organization data is currently placeholder. Interactive org chart and department management is in progress.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Departments", value: String(depts.length), icon: Building2, color: "#3B5BFF" },
          { label: "Total Headcount", value: String(totalHeadcount), icon: Users, color: "#10B981" },
          { label: "Teams", value: String(totalTeams), icon: Users, color: "#8B5CF6" },
          { label: "Avg Dept Size", value: depts.length > 0 ? String(Math.round(totalHeadcount / depts.length)) : "0", icon: Users, color: "#D97706" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs text-[#6b7280]">{s.label}</span>
            </div>
            {isLoading ? <Skeleton className="h-8 w-12" /> : <div className="text-2xl font-bold text-[#111827]">{s.value}</div>}
          </div>
        ))}
      </div>

      {/* Org Chart Placeholder */}
      <DataCard title="Organization Chart">
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="flex flex-col items-center py-6">
          {/* CEO */}
          <div className="bg-gradient-to-r from-[#3B5BFF] to-[#2DD4BF] text-white rounded-lg px-6 py-3 text-center shadow-md">
            <div className="text-sm font-bold">CEO</div>
            <div className="text-[11px] opacity-80">Chief Executive Officer</div>
          </div>
          <div className="w-px h-6 bg-[#d1d5db]" />
          {/* Department row */}
          <div className="flex flex-wrap gap-3 justify-center max-w-3xl">
            {isLoading
              ? Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-[120px]" />)
              : depts.map((d, i) => (
                  <div
                    key={d.name}
                    className="border rounded-lg p-3 text-center min-w-[120px] hover:shadow-sm transition-shadow"
                    style={{ borderColor: COLORS[i % COLORS.length], borderLeftWidth: 3 }}
                  >
                    <div className="text-[12px] font-semibold text-[#1f2937]">{d.name}</div>
                    <div className="text-[10px] text-[#6b7280] mt-0.5">{d.lead}</div>
                    <div className="text-[10px] text-[#9ca3af] mt-0.5">{d.headcount} people &middot; {d.teams} teams</div>
                  </div>
                ))
            }
          </div>
        </div>
      </DataCard>

      {/* Department Details Table */}
      <DataCard title="Department Details">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Department", "Lead Role", "Headcount", "Teams", "% of Org"].map((h) => (
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
                : depts.map((d, i) => (
                    <tr key={d.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1f2937] flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {d.name}
                      </td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{d.lead}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{d.headcount}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{d.teams}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{totalHeadcount > 0 ? Math.round((d.headcount / totalHeadcount) * 100) : 0}%</td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </DataCard>
    </CompanyAdminLayout>
  )
}
