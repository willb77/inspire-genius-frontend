import CompanyAdminLayout from "@/layouts/CompanyAdminLayout"
import DataCard from "@/components/dashboard/DataCard"
import { BookOpen, Clock, Users, TrendingUp } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useCompanyAnalytics as useCompanyAdminAnalytics } from "@/hooks/company-admin/useCompanyAdmin"

type Program = { name: string; enrolled: number; completed: number; status: string }

const FALLBACK_PROGRAMS: Program[] = [
  { name: "PRISM Fundamentals", enrolled: 156, completed: 112, status: "Active" },
  { name: "Leadership Essentials", enrolled: 48, completed: 31, status: "Active" },
  { name: "Communication Skills", enrolled: 89, completed: 67, status: "Active" },
  { name: "Team Collaboration", enrolled: 72, completed: 45, status: "Draft" },
  { name: "Conflict Resolution", enrolled: 34, completed: 20, status: "Scheduled" },
]

export default function CompanyAdminTraining() {
  const { data: analyticsData, isLoading, error, refetch } = useCompanyAdminAnalytics()

  const ad = analyticsData as { programs?: Program[] } | undefined
  const programs = (ad?.programs ?? FALLBACK_PROGRAMS) as Program[]

  return (
    <CompanyAdminLayout>
      <h1 className="text-xl font-bold text-[#111827] mb-1">Training Programs</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Manage and track organization-wide training initiatives.</p>

      {/* Coming Soon Banner */}
      <div className="bg-gradient-to-r from-[#3B5BFF]/10 to-[#2DD4BF]/10 border border-[#3B5BFF]/20 rounded-lg p-4 mb-5">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-[#3B5BFF]" />
          <span className="text-sm font-semibold text-[#1f2937]">Coming Soon</span>
        </div>
        <p className="text-[13px] text-[#6b7280] mt-1">
          Full training management with program creation, enrollment tracking, and completion analytics is under development. The data below is placeholder.
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Active Programs", value: "5", icon: BookOpen, color: "#3B5BFF" },
          { label: "Total Enrolled", value: "399", icon: Users, color: "#10B981" },
          { label: "Avg Completion", value: "69%", icon: TrendingUp, color: "#8B5CF6" },
          { label: "Hours Logged", value: "2,340", icon: Clock, color: "#D97706" },
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

      {/* Programs Table */}
      <DataCard title="Training Programs">
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
                {["Program", "Enrolled", "Completed", "Completion %", "Status"].map((h) => (
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
                : programs.map((p) => (
                    <tr key={p.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1f2937]">{p.name}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{p.enrolled}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{p.completed}</td>
                      <td className="px-3 py-2.5 text-[13px] text-[#374151]">{Math.round((p.completed / p.enrolled) * 100)}%</td>
                      <td className="px-3 py-2.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          p.status === "Active" ? "bg-[#ECFDF5] text-[#059669]"
                            : p.status === "Scheduled" ? "bg-[#DBEAFE] text-[#1E40AF]"
                            : "bg-[#f3f4f6] text-[#6b7280]"
                        }`}>
                          {p.status}
                        </span>
                      </td>
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
