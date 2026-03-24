import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { Award, Users, TrendingUp, Target } from "lucide-react"

const PLACEHOLDER_LEADERS = [
  { name: "Alex Thompson", department: "Engineering", score: 92, potential: "High", programs: 3 },
  { name: "Maria Garcia", department: "Design", score: 90, potential: "High", programs: 2 },
  { name: "James Wilson", department: "Product", score: 87, potential: "High", programs: 4 },
  { name: "Sarah Lee", department: "Sales", score: 85, potential: "Medium", programs: 2 },
  { name: "Tom Harris", department: "Product", score: 83, potential: "Medium", programs: 1 },
  { name: "Chris Martin", department: "Engineering", score: 81, potential: "Medium", programs: 3 },
]

export default function CompanyAdminLeadership() {
  return (
    <CompanyAdminLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Leadership Development</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track leadership pipelines, high-potential talent, and development programs.</p>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-[#8B5CF6]/10 to-[#3B5BFF]/10 border border-[#8B5CF6]/20 rounded-lg p-4 mb-5">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-[#8B5CF6]" />
          <span className="text-sm font-semibold text-[#1f2937]">Coming Soon</span>
        </div>
        <p className="text-[13px] text-[#6b7280] mt-1">
          Full leadership pipeline management with succession planning, competency tracking, and development path analytics is under development. The data below is placeholder.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Leadership Pipeline", value: "24", icon: Users, color: "#8B5CF6" },
          { label: "High Potential", value: "9", icon: TrendingUp, color: "#10B981" },
          { label: "Active Programs", value: "6", icon: Target, color: "#3B5BFF" },
          { label: "Avg Leadership Score", value: "86", icon: Award, color: "#D97706" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-3.5">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              <span className="text-xs text-[#6b7280]">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-[#111827]">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Leadership Pipeline Table */}
      <DataCard title="Leadership Pipeline">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Name", "Department", "Leadership Score", "Potential", "Programs Completed"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLACEHOLDER_LEADERS.map((l) => (
                <tr key={l.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1f2937]">{l.name}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{l.department}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      l.score >= 88 ? "bg-[#D1FAE5] text-[#38A169]" : "bg-[#DBEAFE] text-[#3182CE]"
                    }`}>
                      {l.score}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      l.potential === "High" ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF3C7] text-[#92400E]"
                    }`}>
                      {l.potential}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{l.programs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </CompanyAdminLayout>
  )
}
