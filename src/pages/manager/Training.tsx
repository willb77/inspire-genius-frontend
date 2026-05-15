import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import ProgressBar from "@/components/dashboard/ProgressBar"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerTraining } from "@/hooks/manager/useManagerTeam"

type TrainingProgram = {
  name: string
  enrolled: number
  completionPct: number
  prismRecommendation: string
  status: string
}

const FALLBACK_PROGRAMS: TrainingProgram[] = [
  { name: "Leadership Foundations", enrolled: 8, completionPct: 78, prismRecommendation: "High Gold", status: "active" },
  { name: "Effective Communication", enrolled: 12, completionPct: 92, prismRecommendation: "High Green", status: "active" },
  { name: "Technical Skills Workshop", enrolled: 6, completionPct: 45, prismRecommendation: "High Blue", status: "active" },
  { name: "Conflict Resolution", enrolled: 5, completionPct: 100, prismRecommendation: "All Profiles", status: "confirmed" },
  { name: "Project Management Pro", enrolled: 9, completionPct: 63, prismRecommendation: "High Gold, Blue", status: "active" },
  { name: "Data-Driven Decisions", enrolled: 4, completionPct: 30, prismRecommendation: "High Blue", status: "pending" },
]

export default function ManagerTraining() {
  const { data: trainingData, isLoading, error, refetch } = useManagerTraining()
  const programs = ((trainingData as { programs?: TrainingProgram[] } | undefined)?.programs ?? FALLBACK_PROGRAMS) as TrainingProgram[]

  const avgCompletion = Math.round(programs.reduce((s, p) => s + p.completionPct, 0) / programs.length)
  const totalEnrolled = programs.reduce((s, p) => s + p.enrolled, 0)

  const STATS = [
    { label: "Active Programs", value: String(programs.filter((p) => p.status === "active").length), color: "#3B5BFF" },
    { label: "Total Enrolled", value: String(totalEnrolled), color: "#0D9488" },
    { label: "Avg Completion", value: `${avgCompletion}%`, color: "#10B981" },
    { label: "PRISM Recommended", value: String(programs.length), color: "#8B5CF6" },
  ]

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Training</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Manage training programs and track team completion.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
            ) : (
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <DataCard title="Training Programs" badge={programs.length}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load training programs.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#6b7280] border-b border-[#e5e7eb]">
                  <th className="pb-2 font-medium">Program</th>
                  <th className="pb-2 font-medium">Enrolled</th>
                  <th className="pb-2 font-medium w-[200px]">Completion</th>
                  <th className="pb-2 font-medium">PRISM Recommendation</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {programs.map((p) => (
                  <tr key={p.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="py-2.5 font-medium text-[#111827]">{p.name}</td>
                    <td className="py-2.5 text-[#6b7280]">{p.enrolled}</td>
                    <td className="py-2.5">
                      <ProgressBar value={p.completionPct} color={p.completionPct >= 80 ? "#10B981" : p.completionPct >= 50 ? "#3B82F6" : "#D97706"} />
                    </td>
                    <td className="py-2.5 text-[#6b7280]">{p.prismRecommendation}</td>
                    <td className="py-2.5"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DataCard>
    </ManagerLayout>
  )
}
