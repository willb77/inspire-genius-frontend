import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerCandidates, useManagerHiringStats } from "@/hooks/manager/useManagerTeam"
import { useState } from "react"

type Candidate = {
  name: string
  position: string
  stage: string
  prismMatch: number
  appliedDate: string
  status: string
}

const FALLBACK_CANDIDATES: Candidate[] = [
  { name: "Sarah Chen", position: "Frontend Developer", stage: "Interview", prismMatch: 85, appliedDate: "Mar 10", status: "scheduled" },
  { name: "Marcus Johnson", position: "Product Manager", stage: "Interview", prismMatch: 78, appliedDate: "Mar 8", status: "scheduled" },
  { name: "Elena Rodriguez", position: "UX Designer", stage: "Assessment", prismMatch: 92, appliedDate: "Mar 12", status: "pending" },
  { name: "David Kim", position: "Backend Engineer", stage: "Interview", prismMatch: 81, appliedDate: "Mar 6", status: "scheduled" },
  { name: "Lisa Wang", position: "Data Analyst", stage: "Screening", prismMatch: 74, appliedDate: "Mar 14", status: "new" },
  { name: "Tom Harris", position: "Frontend Developer", stage: "Offer", prismMatch: 88, appliedDate: "Feb 28", status: "confirmed" },
  { name: "Priya Patel", position: "QA Lead", stage: "Assessment", prismMatch: 86, appliedDate: "Mar 11", status: "pending" },
  { name: "Chris Martin", position: "DevOps Engineer", stage: "Screening", prismMatch: 71, appliedDate: "Mar 15", status: "new" },
]

const STAGES = ["All", "Screening", "Assessment", "Interview", "Offer"] as const

const stageColor = (stage: string) => {
  const map: Record<string, string> = {
    Screening: "bg-[#f3f4f6] text-[#374151]",
    Assessment: "bg-[#DBEAFE] text-[#1E40AF]",
    Interview: "bg-[#FEF3C7] text-[#92400E]",
    Offer: "bg-[#D1FAE5] text-[#065F46]",
  }
  return map[stage] ?? "bg-[#f3f4f6] text-[#374151]"
}

const matchColor = (score: number) =>
  score >= 85 ? "text-[#10B981]" : score >= 75 ? "text-[#3B82F6]" : "text-[#D97706]"

export default function ManagerCandidates() {
  const [activeStage, setActiveStage] = useState<string>("All")
  const { data: candidateData, isLoading, error, refetch } = useManagerCandidates()
  const { data: statsData, isLoading: statsLoading } = useManagerHiringStats()

  const candidates = ((candidateData as { candidates?: Candidate[] } | undefined)?.candidates ?? FALLBACK_CANDIDATES) as Candidate[]
  const filtered = activeStage === "All" ? candidates : candidates.filter((c) => c.stage === activeStage)
  const stats = statsData as { openPositions?: number; totalCandidates?: number; interviewsThisWeek?: number; avgTimeToHire?: number } | undefined

  const STATS = [
    { label: "Total Candidates", value: String(stats?.totalCandidates ?? candidates.length), color: "#3B5BFF" },
    { label: "Active", value: String(candidates.filter((c) => c.stage !== "Offer").length), color: "#0D9488" },
    { label: "Interview Stage", value: String(candidates.filter((c) => c.stage === "Interview").length), color: "#3B82F6" },
    { label: "Offers Extended", value: String(candidates.filter((c) => c.stage === "Offer").length), color: "#10B981" },
  ]

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Candidates</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Browse and manage candidates across your hiring pipeline.</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {statsLoading || isLoading ? (
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
            ) : (
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-1.5 mb-4">
        {STAGES.map((stage) => (
          <button
            key={stage}
            onClick={() => setActiveStage(stage)}
            className={`text-[11px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
              activeStage === stage
                ? "bg-[#3B5BFF] text-white"
                : "bg-[#f3f4f6] text-[#374151] hover:bg-[#e5e7eb]"
            }`}
          >
            {stage}
          </button>
        ))}
      </div>

      <DataCard title="Candidate Pipeline" badge={filtered.length}>
        {error && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load candidates.
            <button onClick={() => void refetch()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#6b7280] border-b border-[#e5e7eb]">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Position</th>
                  <th className="pb-2 font-medium">Stage</th>
                  <th className="pb-2 font-medium">PRISM Match</th>
                  <th className="pb-2 font-medium">Applied</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb] transition-colors">
                    <td className="py-2.5 font-medium text-[#111827]">{c.name}</td>
                    <td className="py-2.5 text-[#6b7280]">{c.position}</td>
                    <td className="py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageColor(c.stage)}`}>
                        {c.stage}
                      </span>
                    </td>
                    <td className={`py-2.5 font-semibold ${matchColor(c.prismMatch)}`}>{c.prismMatch}%</td>
                    <td className="py-2.5 text-[#6b7280]">{c.appliedDate}</td>
                    <td className="py-2.5"><StatusBadge status={c.status} /></td>
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
