import ManagerLayout from "@/layouts/ManagerLayout"
import DataCard from "@/components/dashboard/DataCard"
import StatusBadge from "@/components/dashboard/StatusBadge"
import PlaceholderBanner from "@/components/dashboard/PlaceholderBanner"
import { Skeleton } from "@/components/ui/skeleton"
import { useManagerHiringStats, useManagerInterviews } from "@/hooks/manager/useManagerTeam"

const FALLBACK_CANDIDATES = [
  { name: "Sarah Chen", position: "Frontend Developer", stage: "Interview", appliedDate: "Mar 10", prismMatch: 85, status: "scheduled" },
  { name: "Marcus Johnson", position: "Product Manager", stage: "Interview", appliedDate: "Mar 8", prismMatch: 78, status: "scheduled" },
  { name: "Elena Rodriguez", position: "UX Designer", stage: "Assessment", appliedDate: "Mar 12", prismMatch: 92, status: "pending" },
  { name: "David Kim", position: "Backend Engineer", stage: "Interview", appliedDate: "Mar 6", prismMatch: 81, status: "scheduled" },
  { name: "Lisa Wang", position: "Data Analyst", stage: "Screening", appliedDate: "Mar 14", prismMatch: 74, status: "new" },
  { name: "Tom Harris", position: "Frontend Developer", stage: "Offer", appliedDate: "Feb 28", prismMatch: 88, status: "confirmed" },
]

type InterviewItem = { time: string; name: string; position: string; type: string; color: string }

const FALLBACK_INTERVIEWS_TODAY: InterviewItem[] = [
  { time: "9:00 AM", name: "Sarah Chen", position: "Frontend Developer", type: "Technical", color: "#38A169" },
  { time: "10:30 AM", name: "Marcus Johnson", position: "Product Manager", type: "Behavioral", color: "#3B82F6" },
  { time: "1:00 PM", name: "David Kim", position: "Backend Engineer", type: "Technical", color: "#3B5BFF" },
  { time: "2:30 PM", name: "Lisa Wang", position: "Data Analyst", type: "Screening", color: "#8B5CF6" },
]

const JOB_DNA = [
  { position: "Frontend Developer", prismProfile: "High Blue, Medium Green", keyTraits: "Detail-oriented, Collaborative", openings: 1 },
  { position: "Product Manager", prismProfile: "High Gold, High Green", keyTraits: "Strategic, Communicative", openings: 1 },
  { position: "Data Analyst", prismProfile: "High Blue, High Yellow", keyTraits: "Analytical, Steady", openings: 1 },
]

const stageColor = (stage: string) => {
  const map: Record<string, string> = { Screening: "bg-[#f3f4f6] text-[#374151]", Assessment: "bg-[#DBEAFE] text-[#1E40AF]", Interview: "bg-[#FEF3C7] text-[#92400E]", Offer: "bg-[#D1FAE5] text-[#065F46]" }
  return map[stage] ?? "bg-[#f3f4f6] text-[#374151]"
}

const matchColor = (score: number) =>
  score >= 85 ? "text-[#10B981]" : score >= 75 ? "text-[#3B82F6]" : "text-[#D97706]"

export default function ManagerHiring() {
  const { data: hiringStatsData, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useManagerHiringStats()
  const { data: interviewData, isLoading: interviewLoading, error: interviewError, refetch: refetchInterviews } = useManagerInterviews()

  const stats = hiringStatsData as { openPositions?: number; totalCandidates?: number; interviewsThisWeek?: number; avgTimeToHire?: number } | undefined

  const PIPELINE_STATS = [
    { label: "Open Positions", value: String(stats?.openPositions ?? 3), color: "#3B5BFF" },
    { label: "Total Candidates", value: String(stats?.totalCandidates ?? 47), color: "#0D9488" },
    { label: "Interviews This Week", value: String(stats?.interviewsThisWeek ?? 8), color: "#3B82F6" },
    { label: "Avg Time to Hire", value: `${stats?.avgTimeToHire ?? 23} days`, color: "#8B5CF6" },
  ]

  const interviewsToday = ((interviewData as { interviews?: InterviewItem[] } | undefined)?.interviews ?? FALLBACK_INTERVIEWS_TODAY) as InterviewItem[]

  return (
    <ManagerLayout>
      <PlaceholderBanner />
      <h1 className="text-xl font-bold text-[#111827] mb-1">Hiring Pipeline</h1>
      <p className="text-[13px] text-[#6b7280] mb-5">Track candidates, interviews, and Job DNA matching.</p>

      {/* Pipeline Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {PIPELINE_STATS.map((s) => (
          <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-lg p-4 text-center">
            {statsLoading ? (
              <Skeleton className="h-7 w-12 mx-auto mb-1" />
            ) : (
              <div className="text-[22px] font-bold" style={{ color: s.color }}>{s.value}</div>
            )}
            <div className="text-[11px] text-[#6b7280] mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Candidates */}
      <DataCard title="Candidates" badge={47}>
        {statsError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchStats()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Candidate", "Position", "Stage", "Applied", "PRISM Match", "Status"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FALLBACK_CANDIDATES.map((c) => (
                <tr key={c.name} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1f2937]">{c.name}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{c.position}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stageColor(c.stage)}`}>{c.stage}</span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[#6b7280]">{c.appliedDate}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[13px] font-bold ${matchColor(c.prismMatch)}`}>{c.prismMatch}%</span>
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={c.status} label={c.status.charAt(0).toUpperCase() + c.status.slice(1)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Today's Interviews */}
      <DataCard title="Today's Interviews">
        {interviewError && (
          <div className="flex items-center gap-2 py-2 text-[13px] text-[#EF4444]">
            Failed to load data.
            <button onClick={() => void refetchInterviews()} className="underline ml-1 text-[#3B5BFF]">Retry</button>
          </div>
        )}
        {interviewLoading
          ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="py-2.5 border-b border-[#f3f4f6]">
                <Skeleton className="h-8 w-full" />
              </div>
            ))
          : interviewsToday.map((i) => (
              <div key={i.name} className="flex items-center gap-3 py-2.5 border-b border-[#f3f4f6] last:border-b-0">
                <span className="text-xs font-semibold text-[#6b7280] w-[70px] shrink-0">{i.time}</span>
                <span className="text-[13px] font-semibold text-[#1f2937] flex-1">{i.name}</span>
                <span className="text-xs text-[#6b7280] flex-1">{i.position}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3f4f6] text-[#374151]">{i.type}</span>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: i.color }} />
              </div>
            ))
        }
      </DataCard>

      {/* Job DNA */}
      <DataCard title="Job DNA Profiles">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-[#f9fafb] border-b border-[#e5e7eb]">
                {["Position", "PRISM Profile", "Key Traits", "Openings"].map((h) => (
                  <th key={h} className="text-left text-[10px] font-bold uppercase tracking-wider text-[#6b7280] px-3 py-2.5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {JOB_DNA.map((j) => (
                <tr key={j.position} className="border-b border-[#f3f4f6] hover:bg-[#f9fafb]">
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-[#1f2937]">{j.position}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{j.prismProfile}</td>
                  <td className="px-3 py-2.5 text-[13px] text-[#374151]">{j.keyTraits}</td>
                  <td className="px-3 py-2.5 text-[13px] font-bold text-[#3B5BFF]">{j.openings}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataCard>
    </ManagerLayout>
  )
}
