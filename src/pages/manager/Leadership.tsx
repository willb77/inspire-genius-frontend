import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerLeadership } from "@/hooks/manager/useManagerTeam"

type Leader = { name: string; score: number; potential: string; programsCompleted: number; nextStep: string }

const FALLBACK_LEADERS: Leader[] = [
  { name: "James Wilson", score: 91, potential: "High", programsCompleted: 4, nextStep: "Executive Coaching" },
  { name: "Alex Thompson", score: 85, potential: "High", programsCompleted: 3, nextStep: "Tech Lead Certification" },
  { name: "Priya Patel", score: 87, potential: "High", programsCompleted: 3, nextStep: "Management Bootcamp" },
  { name: "Lisa Park", score: 82, potential: "Medium", programsCompleted: 2, nextStep: "Facilitation Workshop" },
  { name: "Maria Garcia", score: 78, potential: "Medium", programsCompleted: 2, nextStep: "Design Leadership" },
  { name: "Chris Martin", score: 74, potential: "Medium", programsCompleted: 1, nextStep: "Team Lead Training" },
]

const scoreColor = (score: number) => score >= 85 ? "#10B981" : score >= 75 ? "#3B82F6" : "#D97706"

const potentialStyle = (p: string) => {
  const map: Record<string, string> = { High: "bg-[#D1FAE5] text-[#065F46]", Medium: "bg-[#DBEAFE] text-[#1E40AF]", Low: "bg-[#FEF3C7] text-[#92400E]" }
  return map[p] ?? "bg-[#f3f4f6] text-[#374151]"
}

export default function ManagerLeadership() {
  const { data: leaderData, isLoading, error, refetch } = useManagerLeadership()
  const leaders = ((leaderData as { leaders?: Leader[] } | undefined)?.leaders ?? FALLBACK_LEADERS) as Leader[]

  const avgScore = Math.round(leaders.reduce((s, l) => s + l.score, 0) / leaders.length)
  const highPotential = leaders.filter((l) => l.potential === "High").length

  const STATS = [
    { label: "Total Leaders", value: String(leaders.length), color: "#3B5BFF" },
    { label: "Avg Score", value: String(avgScore), color: "#0D9488" },
    { label: "High Potential", value: String(highPotential), color: "#10B981" },
    { label: "Programs Active", value: "4", color: "#8B5CF6" },
  ]

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Leadership</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track leadership development, potential assessments, and program progress.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {isLoading ? <Skeleton className="h-7 w-12 mx-auto mb-1" /> : <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <DataCard title="Leadership Pipeline" badge={leaders.length}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load leadership data.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#6b7280] border-b border-[#e5e7eb]">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Leadership Score</th>
                  <th className="pb-2 font-medium">Potential</th>
                  <th className="pb-2 font-medium">Programs Completed</th>
                  <th className="pb-2 font-medium">Next Step</th>
                </tr>
              </thead>
              <tbody>
                {leaders.map((l) => (
                  <tr key={l.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="py-2.5 font-medium text-[#111827]">{l.name}</td>
                    <td className="py-2.5"><span className="font-bold text-[14px]" style={{ color: scoreColor(l.score) }}>{l.score}</span></td>
                    <td className="py-2.5"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${potentialStyle(l.potential)}`}>{l.potential}</span></td>
                    <td className="py-2.5 text-[#6b7280]">{l.programsCompleted}</td>
                    <td className="py-2.5 text-[#6b7280]">{l.nextStep}</td>
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
